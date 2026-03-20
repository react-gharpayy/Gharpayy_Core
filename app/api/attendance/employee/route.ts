import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

function getISTDate() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtMins(m: number) {
  if (!m) return '0m';
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('id');
    if (!employeeId) return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });

    await connectDB();

    const emp = await User.findById(employeeId);
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const today = getISTDate();
    const att = await Attendance.findOne({ employeeId, date: today });

    const timeline: { time: string; label: string; type: string }[] = [];
    if (att) {
      for (const s of att.sessions) {
        timeline.push({ time: fmtTime(new Date(s.checkIn)), label: 'Clocked In', type: 'checkin' });
        if (s.checkOut) timeline.push({ time: fmtTime(new Date(s.checkOut)), label: 'Clocked Out', type: 'checkout' });
      }
    }

    const lastSession = att?.sessions?.[att.sessions.length - 1];

    return NextResponse.json({
      employee: {
        _id: emp._id.toString(),
        fullName: emp.fullName,
        email: emp.email,
        role: emp.role,
      },
      attendance: att ? {
        isCheckedIn: att.isCheckedIn,
        dayStatus: att.dayStatus,
        firstCheckIn: att.sessions?.[0]?.checkIn?.toISOString() || null,
        lastCheckOut: lastSession?.checkOut?.toISOString() || null,
        totalWorkMins: att.totalWorkMins,
        totalWorkFormatted: fmtMins(att.totalWorkMins),
        sessions: att.sessions.length,
        timeline,
      } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
