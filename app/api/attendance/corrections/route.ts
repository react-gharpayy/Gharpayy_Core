import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import ExceptionRequest from '@/models/ExceptionRequest';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { deriveStatusFromAttendance, getShiftRules, recomputeAttendanceTotals } from '@/lib/attendance-utils';
import { correctionSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { maybeCreditCompOff } from '@/lib/comp-off';

function toDateInIST(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 5, mm - 30, 0));
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    let parsed;
    try {
      parsed = correctionSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      }
      throw e;
    }

    const { employeeId, date, clockIn, clockOut, reason } = parsed;
    if (!employeeId || !date || !clockIn || !clockOut) {
      return NextResponse.json({ error: 'employeeId, date, clockIn, clockOut required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emp = await User.findById(employeeId).lean() as any;
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    if (user.role === 'manager' && emp.managerId?.toString?.() !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const inDate = toDateInIST(date, clockIn);
    const outDate = toDateInIST(date, clockOut);
    if (outDate <= inDate) return NextResponse.json({ error: 'clockOut must be after clockIn' }, { status: 400 });

    let att = await Attendance.findOne({ employeeId, date });
    if (!att) {
      att = new Attendance({ employeeId, date, sessions: [], isCheckedIn: false, dayStatus: 'Absent', workMode: 'Present' });
    }

    const minutes = Math.max(0, Math.floor((outDate.getTime() - inDate.getTime()) / 60000));
    att.sessions.push({ checkIn: inDate, checkOut: outDate, type: 'work', minutes, workMinutes: minutes, lat: null, lng: null });
    att.isCheckedIn = false;
    att.isOnBreak = false;
    att.isInField = false;
    att.workMode = 'Present';
    recomputeAttendanceTotals(att);
    const rules = await getShiftRules();
    const derived = deriveStatusFromAttendance(att, rules);
    att.dayStatus = derived.dayStatus;
    att.lateByMins = derived.lateByMins;
    att.earlyByMins = derived.earlyByMins;
    att.markModified('sessions');
    await att.save();

    await ExceptionRequest.create({
      employeeId,
      employeeName: emp.fullName || emp.email,
      type: 'manual_entry',
      date,
      reason: reason || 'Manual attendance correction',
      status: 'approved',
      reviewedBy: user.id,
      reviewedByName: user.fullName || user.email || 'Admin',
      reviewNote: `Corrected to ${clockIn}-${clockOut}`,
      reviewedAt: new Date(),
    });

    try {
      await maybeCreditCompOff(employeeId, date, String(att._id), Number(att.totalWorkMins || 0));
    } catch {}

    return NextResponse.json({ ok: true, attendanceId: att._id.toString() });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
