import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getAuthUser } from '@/lib/auth';
import {
  autoCloseMissedClockOut,
  getISTDateStr,
  getShiftRules,
  applyUserSchedule,
  getStatusByShiftRules,
  recomputeAttendanceTotals,
} from '@/lib/attendance-utils';
import { notifyLateAlert } from '@/lib/system-notifications';
import User from '@/models/User';

function fmtISTTimeLabel(date: Date) {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'admin') return NextResponse.json({ error: 'Admin cannot use attendance' }, { status: 400 });

    const { lat, lng, type } = await req.json().catch(() => ({ lat: null, lng: null, type: null }));
    await connectDB();
    await autoCloseMissedClockOut(user.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbUser = await User.findById(user.id).select('workSchedule').lean() as any;
    const baseRules = await getShiftRules();
    const rules = applyUserSchedule(baseRules, dbUser?.workSchedule);

    const date = getISTDateStr();
    let att = await Attendance.findOne({ employeeId: user.id, date });

    const now = new Date();
    const sessionType = type === 'field_return' ? 'field' : 'work';

    if (type === 'break_end') {
      if (!att || !att.isOnBreak) return NextResponse.json({ error: 'No active break to end' }, { status: 400 });
      const last = att.sessions?.[att.sessions.length - 1];
      if (last && !last.checkOut && last.type === 'break') {
        const mins = Math.max(0, Math.floor((now.getTime() - new Date(last.checkIn).getTime()) / 60000));
        last.checkOut = now;
        last.minutes = mins;
      }
      att.sessions.push({ checkIn: now, checkOut: null, type: 'work', minutes: 0, workMinutes: 0, lat: lat || null, lng: lng || null });
      att.isCheckedIn = true;
      att.isOnBreak = false;
      att.workMode = 'Present';
      recomputeAttendanceTotals(att);
      att.markModified('sessions');
      await att.save();
      return NextResponse.json({ ok: true, checkInTime: now.toISOString(), action: 'break_end' });
    }

    if (type === 'field_return') {
      if (!att || !att.isInField) return NextResponse.json({ error: 'No active field visit to return from' }, { status: 400 });
      const last = att.sessions?.[att.sessions.length - 1];
      if (last && !last.checkOut && last.type === 'field') {
        const mins = Math.max(0, Math.floor((now.getTime() - new Date(last.checkIn).getTime()) / 60000));
        last.checkOut = now;
        last.minutes = mins;
        last.workMinutes = mins;
      }
      att.sessions.push({ checkIn: now, checkOut: null, type: 'work', minutes: 0, workMinutes: 0, lat: lat || null, lng: lng || null });
      att.isCheckedIn = true;
      att.isInField = false;
      att.workMode = 'Present';
      recomputeAttendanceTotals(att);
      att.markModified('sessions');
      await att.save();
      return NextResponse.json({ ok: true, checkInTime: now.toISOString(), action: 'field_return' });
    }

    if (att?.isCheckedIn) return NextResponse.json({ error: 'Already checked in' }, { status: 400 });
    if (att?.isOnBreak) return NextResponse.json({ error: 'Break active. End break first.' }, { status: 400 });
    if (att?.isInField) return NextResponse.json({ error: 'Field visit active. Return first.' }, { status: 400 });

    if (!att) {
      const status = getStatusByShiftRules(now, rules);
      att = new Attendance({
        employeeId: user.id,
        date,
        dayStatus: status.dayStatus,
        lateByMins: status.lateByMins,
        earlyByMins: status.earlyByMins,
        sessions: [{ checkIn: now, checkOut: null, type: sessionType, minutes: 0, workMinutes: 0, lat: lat || null, lng: lng || null }],
        totalWorkMins: 0,
        totalBreakMins: 0,
        isCheckedIn: true,
        isOnBreak: false,
        isInField: false,
        workMode: 'Present',
      });
    } else {
      att.sessions.push({ checkIn: now, checkOut: null, type: sessionType, minutes: 0, workMinutes: 0, lat: lat || null, lng: lng || null });
      att.isCheckedIn = true;
      att.workMode = 'Present';
      if (att.sessions.length === 1) {
        const status = getStatusByShiftRules(now, rules);
        att.dayStatus = status.dayStatus;
        att.lateByMins = status.lateByMins;
        att.earlyByMins = status.earlyByMins;
      }
    }

    recomputeAttendanceTotals(att);
    att.markModified('sessions');
    await att.save();

    if (att.dayStatus === 'Late') {
      await notifyLateAlert({
        employeeId: user.id,
        employeeName: user.fullName || user.email || 'Employee',
        date,
        clockInLabel: fmtISTTimeLabel(now),
        lateByMins: Number(att.lateByMins || 0),
        shiftStart: rules.shiftStart,
        graceMinutes: Number(rules.graceMinutes || 0),
      });
    }

    return NextResponse.json({
      ok: true,
      checkInTime: now.toISOString(),
      dayStatus: att.dayStatus,
      lateByMins: att.lateByMins || 0,
      earlyByMins: att.earlyByMins || 0,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
