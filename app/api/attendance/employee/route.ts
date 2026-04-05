import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { applyUserSchedule, deriveStatusFromAttendance, getISTDateStr, getShiftRules, recomputeAttendanceTotals } from '@/lib/attendance-utils';
import { IST_OFFSET_MS } from '@/lib/constants';
import { canAccessEmployee } from '@/lib/role-guards';

function fmtTime(d: Date) {
  return new Date(d.getTime() + IST_OFFSET_MS)
    .toISOString()
    .split('T')[1]
    .substring(0, 5)
    .replace(/(\d{2}):(\d{2})/, (_, h, m) => {
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12  = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    });
}

function fmtMins(m: number) {
  if (!m) return '0m';
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    // sub_admin now allowed - was only admin|manager
    if (!user || !['admin', 'manager', 'sub_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('id');
    if (!employeeId) return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });

    await connectDB();
    const emp = await User.findById(employeeId);
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    if (user.role === 'manager' && emp.managerId?.toString() !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // sub_admin: verify the employee belongs to their team before returning any data
    if (!canAccessEmployee(user, emp.officeZoneId?.toString())) {
      return NextResponse.json({ error: 'Access denied: employee is not in your team' }, { status: 403 });
    }

    const today = getISTDateStr();
    const att   = await Attendance.findOne({ employeeId, date: today });
    const baseRules = await getShiftRules();
    const rules = applyUserSchedule(baseRules, emp?.workSchedule);

    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    const startDate = start.toISOString().split('T')[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthRows = await Attendance.find({ employeeId, date: { $gte: startDate, $lte: today } }).lean() as any[];

    const timeline: { time: string; label: string; type: string }[] = [];
    if (att) {
      recomputeAttendanceTotals(att);
      const derived = deriveStatusFromAttendance(att, rules);
      if (att.dayStatus !== derived.dayStatus || (att.lateByMins || 0) !== derived.lateByMins || (att.earlyByMins || 0) !== derived.earlyByMins) {
        att.dayStatus = derived.dayStatus;
        att.lateByMins = derived.lateByMins;
        att.earlyByMins = derived.earlyByMins;
        await att.save();
      }
      for (const s of att.sessions) {
        if (s.type === 'break') {
          timeline.push({ time: fmtTime(new Date(s.checkIn)), label: 'Break Started',  type: 'break_start' });
          if (s.checkOut) timeline.push({ time: fmtTime(new Date(s.checkOut)), label: 'Break Ended', type: 'break_end' });
        } else if (s.type === 'field') {
          timeline.push({ time: fmtTime(new Date(s.checkIn)), label: 'Field Exit',    type: 'field_exit' });
          if (s.checkOut) timeline.push({ time: fmtTime(new Date(s.checkOut)), label: 'Field Return', type: 'field_return' });
        } else {
          timeline.push({ time: fmtTime(new Date(s.checkIn)), label: 'Clocked In',    type: 'checkin' });
          if (s.checkOut) timeline.push({ time: fmtTime(new Date(s.checkOut)), label: 'Clocked Out', type: 'checkout' });
        }
      }
    }

    const lastSession = att?.sessions?.[att.sessions.length - 1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lateDays    = monthRows.filter((r: any) => r.dayStatus === 'Late').length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earlyDays   = monthRows.filter((r: any) => r.dayStatus === 'Early').length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onTimeDays  = monthRows.filter((r: any) => r.dayStatus === 'On Time').length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const presentDays = monthRows.filter((r: any) => r.dayStatus !== 'Absent').length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalWorkMins30 = monthRows.reduce((s: number, r: any) => s + Number(r.totalWorkMins || 0), 0);
    const avgWorkMins     = monthRows.length ? Math.round(totalWorkMins30 / monthRows.length) : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hourlyDist = monthRows.reduce((acc: Record<string, number>, r: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const first = r.sessions?.find((s: any) => (s.type || 'work') !== 'break');
      if (first?.checkIn) {
        const d    = new Date(first.checkIn);
        const hour = d.toLocaleTimeString('en-IN', { hour: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
        acc[hour]  = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {});

    return NextResponse.json({
      employee: { _id: emp._id.toString(), fullName: emp.fullName, email: emp.email, role: emp.role },
      attendance: att ? {
        isCheckedIn:       att.isCheckedIn,
        dayStatus:         att.dayStatus,
        firstCheckIn:      att.sessions?.[0]?.checkIn?.toISOString() || null,
        lastCheckOut:      lastSession?.checkOut?.toISOString() || null,
        totalWorkMins:     att.totalWorkMins,
        totalBreakMins:    att.totalBreakMins || 0,
        totalWorkFormatted: fmtMins(att.totalWorkMins),
        sessions:          att.sessions.length,
        lateByMins:        att.lateByMins  || 0,
        earlyByMins:       att.earlyByMins || 0,
        timeline,
      } : null,
      analytics: {
        windowDays: 30, presentDays, lateDays, earlyDays, onTimeDays, avgWorkMins,
        onTimeRate:  presentDays ? Math.round(((onTimeDays + earlyDays) / presentDays) * 100) : 0,
        lateRate:    presentDays ? Math.round((lateDays  / presentDays) * 100) : 0,
        earlyRate:   presentDays ? Math.round((earlyDays / presentDays) * 100) : 0,
        arrivalPattern: hourlyDist,
      },
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
