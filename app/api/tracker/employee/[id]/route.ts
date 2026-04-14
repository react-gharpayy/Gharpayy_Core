import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Tracker from '@/models/Tracker';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getISTDateStr } from '@/lib/attendance-utils';
import { listDatesInRange, weekdayName, getPolicyForUser, getHolidaysInRange } from '@/lib/leave-utils';
import { TRACKER_LAUNCH_DATE } from '@/lib/constants';
import Leave from '@/models/Leave';
import { buildEmployeeFilter } from '@/lib/role-guards';

function dateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return getISTDateStr(d);
}

function getWeekKey(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') || dateDaysAgo(89);
    const end = searchParams.get('end') || getISTDateStr();

    await connectDB();
    const empFilter = buildEmployeeFilter(auth, { _id: id });
    if (empFilter === null) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const employee = await User.findOne(empFilter).select('fullName email role teamName department workSchedule createdAt').lean() as any;
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const launchDate = TRACKER_LAUNCH_DATE;
    const joiningDate = employee?.createdAt ? getISTDateStr(new Date(employee.createdAt)) : launchDate;
    const effectiveStart = [start, launchDate, joiningDate].sort().pop() as string;

    const rows = await Tracker.find({
      employeeId: new mongoose.Types.ObjectId(id),
      date: { $gte: effectiveStart, $lte: end },
    }).sort({ date: -1 }).lean();

    const weeklyMap: Record<string, any[]> = {};
    const monthlyMap: Record<string, any[]> = {};
    rows.forEach((r: any) => {
      const weekKey = getWeekKey(r.date);
      const monthKey = r.date.slice(0, 7);
      if (!weeklyMap[weekKey]) weeklyMap[weekKey] = [];
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = [];
      weeklyMap[weekKey].push(r);
      monthlyMap[monthKey].push(r);
    });

    const daysInRange = listDatesInRange(effectiveStart, end);
    const policy = await getPolicyForUser(id);
    const weekOffs = Array.isArray(employee?.workSchedule?.weekOffs) && employee.workSchedule.weekOffs.length > 0
      ? employee.workSchedule.weekOffs
      : Array.isArray((policy as any)?.weeklyOffDays) ? (policy as any).weeklyOffDays : [];
    const holidayDates = (await getHolidaysInRange(effectiveStart, end)).map(h => h.date);
    const holidaySet = new Set(holidayDates);
    const weekOffSet = new Set(weekOffs.map((d: string) => d.toLowerCase()));

    const approvedLeaves = await Leave.find({
      employeeId: new mongoose.Types.ObjectId(id),
      status: 'approved',
      startDate: { $lte: end },
      endDate: { $gte: effectiveStart },
    }).lean();
    const leaveDates = new Set(
      approvedLeaves.flatMap((l: any) => listDatesInRange(l.startDate, l.endDate))
    );

    const eligibleDays = daysInRange.filter(d => {
      const isHoliday = holidaySet.has(d);
      const isWeekOff = weekOffSet.has(weekdayName(d).toLowerCase());
      const isLeave = leaveDates.has(d);
      return !isHoliday && !isWeekOff && !isLeave;
    });

    const submittedDays = rows.filter((r: any) => r.isSubmitted && eligibleDays.includes(r.date)).length;
    const editedDays = rows.filter((r: any) => r.isEdited).length;
    const missedDays = Math.max(0, eligibleDays.length - submittedDays);
    const rowDates = new Set(rows.map((r: any) => r.date));
    const missedDates = eligibleDays.filter(d => !rowDates.has(d));

    return NextResponse.json({
      ok: true,
      employee,
      range: { start: effectiveStart, end },
      summary: {
        totalDays: eligibleDays.length,
        submittedDays,
        editedDays,
        missedDays,
      },
      records: rows,
      weekly: weeklyMap,
      monthly: monthlyMap,
      missedDates,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
