import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import OfficeZone from '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';

const IST_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
};

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-IN', IST_TIME_OPTIONS);
}

function getISTNow() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
}

function getTodayIST() {
  return getISTNow().toISOString().split('T')[0];
}

function statusSortOrder(status: string): number {
  if (status === 'Early')   return 0;
  if (status === 'On Time') return 1;
  if (status === 'Late')    return 2;
  return 3;
}

function getWeekDatesFromStr(weekStr: string): string[] {
  const [year, weekNum] = weekStr.split('-').map(Number);
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const jan1Day = jan1.getUTCDay();
  const mondayOfWeek1 = new Date(jan1);
  mondayOfWeek1.setUTCDate(jan1.getUTCDate() + (jan1Day === 0 ? 1 : jan1Day === 1 ? 0 : 8 - jan1Day));
  const monday = new Date(mondayOfWeek1);
  monday.setUTCDate(mondayOfWeek1.getUTCDate() + (weekNum - 1) * 7);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

const WEEK_OFF_LABEL: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const week   = searchParams.get('week');
    const date   = searchParams.get('date');
    const teamId = searchParams.get('team');

    await connectDB();

    const isManager = user.role === 'admin' || user.role === 'manager';
    const todayStr  = getTodayIST();
    const logDate   = date || todayStr;

    // Get week off day from DB
    const zone         = await OfficeZone.findOne({}).lean() as any;
    const weekOffDay   = zone?.weekOffDay || 'Tuesday';
    const weekOffLabel = WEEK_OFF_LABEL[weekOffDay] || 'Tue';

    const shiftInfo = {
      earlyBefore:  '9:00 AM',
      onTimeTill:   '9:15 AM',
      lateAfter:    '9:15 AM',
      weekOffDay,
      weekOffLabel,
    };

    // Determine date range
    let dates: string[] = [];
    if (date)      dates = [date];
    else if (week) dates = getWeekDatesFromStr(week);

    if (isManager) {
      const userQuery: any = {};
      if (teamId) userQuery.officeZoneId = teamId;

      const users = await User.find(userQuery, 'fullName email role officeZoneId isApproved')
        .populate('officeZoneId', 'name')
        .lean() as any[];

      const employeeIds = users.map(u => u._id.toString());

      // Heatmap attendance
      const attQuery: any = { employeeId: { $in: employeeIds } };
      if (dates.length > 0) attQuery.date = { $in: dates };
      const allAtt = await Attendance.find(attQuery).lean() as any[];

      const heatmap = users.map((u: any) => {
        const empAtt = allAtt.filter(a => a.employeeId.toString() === u._id.toString());
        const days: Record<string, string> = {};
        for (const a of empAtt) days[a.date] = a.dayStatus;
        return {
          employeeId:   u._id.toString(),
          employeeName: u.fullName,
          role:         u.role,
          team:         (u.officeZoneId as any)?.name || 'No Zone',
          isApproved:   u.isApproved,
          days,
        };
      });

      // Selected date log
      const logAtt = await Attendance.find({
        employeeId: { $in: employeeIds },
        date: logDate,
      }).lean() as any[];

      const todayLog = users
        .map((u: any) => {
          const att       = logAtt.find(a => a.employeeId.toString() === u._id.toString());
          const firstSess = att?.sessions?.[0];
          return {
            employeeId:    u._id.toString(),
            employeeName:  u.fullName,
            role:          u.role,
            team:          (u.officeZoneId as any)?.name || 'No Zone',
            checkInTime:   firstSess?.checkIn ? fmtTime(new Date(firstSess.checkIn)) : null,
            isCheckedIn:   att?.isCheckedIn || false,
            dayStatus:     att?.dayStatus || 'Absent',
            totalWorkMins: att?.totalWorkMins || 0,
          };
        })
        .sort((a, b) => statusSortOrder(a.dayStatus) - statusSortOrder(b.dayStatus));

      const present = todayLog.filter((e: any) => e.dayStatus !== 'Absent').length;

      return NextResponse.json({ heatmap, todayLog, total: users.length, present, shiftInfo });

    } else {
      // Employee — own data only
      const attQuery: any = { employeeId: user.id };
      if (dates.length > 0) attQuery.date = { $in: dates };

      const empAtt = await Attendance.find(attQuery).lean() as any[];
      const days: Record<string, string> = {};
      for (const a of empAtt) days[a.date] = a.dayStatus;

      return NextResponse.json({
        heatmap: [{ employeeId: user.id, employeeName: user.fullName, days }],
        todayLog: [],
        total:    1,
        present:  days[todayStr] && days[todayStr] !== 'Absent' ? 1 : 0,
        shiftInfo,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}