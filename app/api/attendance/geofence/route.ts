import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

function getISTDate() {
  const now = new Date();
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

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
    const today = getISTDate();

    const users = await User.find({}, 'fullName email role');
    const todayAtt = await Attendance.find({ date: today });

    const employees = users.map((u: any) => {
      const att = todayAtt.find((a: any) => a.employeeId.toString() === u._id.toString());
      // Get last session with GPS
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

    const present = employees.filter((e: any) => e.dayStatus !== 'Absent').length;

    return NextResponse.json({ employees, present, total: users.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
