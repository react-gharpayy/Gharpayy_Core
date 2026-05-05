import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { buildEmployeeFilter } from '@/lib/role-guards';
import { IST_OFFSET_MS } from '@/lib/constants';

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function getISTDate(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

function getRange(params: URLSearchParams) {
  const mode = params.get('mode') || 'today';
  const dateParam = params.get('date');
  const today = toDateStr(getISTDate());
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  if (mode === 'weekly') {
    const end = new Date(`${date}T00:00:00.000Z`);
    const start = new Date(end.getTime() - 6 * 86400000);
    return { mode, start: toDateStr(start), end: toDateStr(end) };
  }

  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  if (mode === 'range' && dateFrom && dateTo) {
    return { mode, start: dateFrom, end: dateTo };
  }

  return { mode, start: date, end: date };
}

function listDates(start: string, end: string) {
  const days: string[] = [];
  const s = new Date(`${start}T00:00:00.000Z`);
  const e = new Date(`${end}T00:00:00.000Z`);
  for (let d = s; d <= e; d = new Date(d.getTime() + 86400000)) {
    days.push(toDateStr(d));
  }
  return days;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role === 'employee') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { mode, start, end } = getRange(searchParams);
    const team = searchParams.get('team') || '';
    const manager = searchParams.get('manager') || '';

    const days = listDates(start, end);
    if (days.length > 31) {
      return NextResponse.json({ error: 'Date range too large (max 31 days)' }, { status: 400 });
    }

    await connectDB();
    const baseFilter: any = { isApproved: { $ne: false } };
    if (team) baseFilter.officeZoneId = team;
    if (manager) baseFilter.managerId = manager;
    const empFilter = buildEmployeeFilter(auth, baseFilter);
    if (empFilter === null) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const users = await User.find(empFilter)
      .select('fullName role officeZoneId')
      .populate('officeZoneId', 'name')
      .lean() as any[];
    const employeeIds = users.map(u => u._id);

    const rows = await Attendance.find({
      employeeId: { $in: employeeIds },
      date: { $gte: start, $lte: end },
    }).lean() as any[];

    const attMap = new Map<string, any>();
    rows.forEach(r => {
      attMap.set(`${r.employeeId.toString()}_${r.date}`, r);
    });

    const dailyRows = [];
    for (const u of users) {
      const teamName = (u.officeZoneId as any)?.name || 'No Zone';
      for (const day of days) {
        const att = attMap.get(`${u._id.toString()}_${day}`);
        dailyRows.push({
          employeeId: u._id.toString(),
          employeeName: u.fullName,
          role: u.role,
          team: teamName,
          date: day,
          totalBreakMins: att?.totalBreakMins || 0,
          totalWorkMins: att?.totalWorkMins || 0,
          dayStatus: att?.dayStatus || 'Absent',
          workMode: att?.workMode || (att?.isOnBreak ? 'Break' : att?.isInField ? 'Field' : att?.isCheckedIn ? 'Present' : 'Absent'),
        });
      }
    }

    const weeklySummary = users.map(u => {
      const teamName = (u.officeZoneId as any)?.name || 'No Zone';
      const sum = rows
        .filter(r => r.employeeId.toString() === u._id.toString())
        .reduce((acc, r) => acc + Number(r.totalBreakMins || 0), 0);
      const work = rows
        .filter(r => r.employeeId.toString() === u._id.toString())
        .reduce((acc, r) => acc + Number(r.totalWorkMins || 0), 0);
      return {
        employeeId: u._id.toString(),
        employeeName: u.fullName,
        role: u.role,
        team: teamName,
        totalBreakMins: sum,
        totalWorkMins: work,
      };
    });

    return NextResponse.json({
      ok: true,
      mode,
      range: { start, end },
      days,
      dailyRows,
      weeklySummary,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

