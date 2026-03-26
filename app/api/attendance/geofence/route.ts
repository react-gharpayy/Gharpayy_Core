import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { getISTDateStr } from '@/lib/attendance-utils';

const IST_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
};

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-IN', IST_TIME_OPTIONS);
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const today = getISTDateStr();

    const users = await User.find({}, 'fullName email role');
    const todayAtt = await Attendance.find({ date: today });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employees = users.map((u: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const att = todayAtt.find((a: any) => a.employeeId.toString() === u._id.toString());
      // Get last session with GPS
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastSessionWithGps = att?.sessions?.slice().reverse().find((s: any) => s.lat && s.lng);
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
        lat: lastSessionWithGps?.lat || null,
        lng: lastSessionWithGps?.lng || null,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const present = employees.filter((e: any) => e.dayStatus !== 'Absent').length;

    return NextResponse.json({ employees, present, total: users.length });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
