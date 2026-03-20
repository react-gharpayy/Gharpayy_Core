import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

const IST_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
};

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-IN', IST_TIME_OPTIONS);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const week = searchParams.get('week'); // YYYY-WW

    await connectDB();

    const isManager = user.role === 'admin' || user.role === 'manager';

    // Get week dates
    function getWeekDates(weekStr: string) {
      const [year, week] = weekStr.split('-').map(Number);
      const jan1 = new Date(year, 0, 1);
      const dayOfWeek = jan1.getDay() || 7;
      const startOfWeek1 = new Date(jan1);
      startOfWeek1.setDate(jan1.getDate() + (dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek));
      const startDate = new Date(startOfWeek1);
      startDate.setDate(startOfWeek1.getDate() + (week - 1) * 7);
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
    }

    const dates = week ? getWeekDates(week) : [];

    if (isManager) {
      // Return all employees attendance
      const users = await User.find({}, 'fullName email role');
      const allAtt = dates.length > 0
        ? await Attendance.find({ date: { $in: dates } })
        : await Attendance.find({});

      // Build heatmap per employee
      const heatmap = users.map((u: any) => {
        const empAtt = allAtt.filter((a: any) => a.employeeId.toString() === u._id.toString());
        const days: Record<string, string> = {};
        for (const a of empAtt) {
          days[a.date] = a.dayStatus;
        }
        return {
          employeeId: u._id.toString(),
          employeeName: u.fullName,
          role: u.role,
          days,
        };
      });

      // Today's log
      const today = new Date();
      const ist = new Date(today.getTime() + 5.5 * 60 * 60 * 1000);
      const todayStr = ist.toISOString().split('T')[0];
      const todayAtt = await Attendance.find({ date: todayStr });

      const todayLog = users.map((u: any) => {
        const att = todayAtt.find((a: any) => a.employeeId.toString() === u._id.toString());
        const lastSession = att?.sessions?.[att.sessions.length - 1];
        return {
          employeeId: u._id.toString(),
          employeeName: u.fullName,
          role: u.role,
          checkInTime: lastSession?.checkIn
            ? fmtTime(new Date(lastSession.checkIn))
            : null,
          isCheckedIn: att?.isCheckedIn || false,
          dayStatus: att?.dayStatus || 'Absent',
          totalWorkMins: att?.totalWorkMins || 0,
        };
      });

      const present = todayLog.filter((e: any) => e.dayStatus !== 'Absent').length;

      return NextResponse.json({ heatmap, todayLog, total: users.length, present });
    } else {
      // Employee: own heatmap only
      const empAtt = dates.length > 0
        ? await Attendance.find({ employeeId: user.id, date: { $in: dates } })
        : await Attendance.find({ employeeId: user.id });

      const days: Record<string, string> = {};
      for (const a of empAtt) {
        days[a.date] = a.dayStatus;
      }

      return NextResponse.json({
        heatmap: [{ employeeId: user.id, employeeName: user.fullName, days }],
        todayLog: [],
        total: 1,
        present: 1,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
