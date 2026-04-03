import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import User from '@/models/User';
import mongoose from 'mongoose';
import { IST_OFFSET_MS } from '@/lib/constants';
import Leave from '@/models/Leave';
import LeaveBalance from '@/models/LeaveBalance';
import { getPolicyForUser, getHolidaysInRange, calculateLeaveDays, ensureLeaveBalance } from '@/lib/leave-utils';

function getISTDate(offsetDays = 0) {
  const d = new Date(Date.now() + IST_OFFSET_MS);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export async function POST() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role === 'admin') return NextResponse.json({ error: 'Employee/manager action only' }, { status: 403 });

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(auth.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const tomorrow = getISTDate(1);

    const existingLeave = await Leave.findOne({
      employeeId: auth.id,
      startDate: tomorrow,
      endDate: tomorrow,
      $or: [{ leaveType: 'casual' }, { type: 'Casual' }],
      reason: 'Off tomorrow',
      status: { $in: ['pending', 'approved'] },
    }).lean() as any;

    if (existingLeave) {
      return NextResponse.json({
        ok: true,
        status: existingLeave.status,
        message: existingLeave.status === 'approved' ? 'Off tomorrow already approved' : 'Off tomorrow request already pending',
      });
    }

    await connectDB();
    const policy = await getPolicyForUser(auth.id);
    const holidays = await getHolidaysInRange(tomorrow, tomorrow);
    const weekOffs = Array.isArray(user.workSchedule?.weekOffs) && user.workSchedule.weekOffs.length > 0
      ? user.workSchedule.weekOffs
      : Array.isArray(policy?.weeklyOffDays) ? policy.weeklyOffDays : [];

    const days = calculateLeaveDays({
      startDate: tomorrow,
      endDate: tomorrow,
      weekOffs,
      holidays: holidays.map(h => h.date),
      holidayExclusionEnabled: (policy as any)?.holidayExclusionEnabled !== false,
      weeklyOffExclusionEnabled: (policy as any)?.weeklyOffExclusionEnabled !== false,
    });

    const leave = await Leave.create({
      employeeId: auth.id,
      employeeName: user.fullName || auth.fullName || auth.email,
      leaveType: 'casual',
      startDate: tomorrow,
      endDate: tomorrow,
      totalDays: days || 1,
      status: 'pending',
      reason: 'Off tomorrow',
    });

    try {
      const balance = await ensureLeaveBalance(auth.id) as any;
      const entry = balance.casual || { total: 12, used: 0, pending: 0 };
      const inc = Number(days || 1);
      entry.pending = Number(entry.pending || 0) + inc;
      balance.casual = entry;
      await balance.save();
    } catch {}

    return NextResponse.json({
      ok: true,
      status: 'pending',
      leave,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role === 'admin') return NextResponse.json({ error: 'Employee/manager action only' }, { status: 403 });

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(auth.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const tomorrow = getISTDate(1);
    const offLeave = await Leave.findOne({
      employeeId: auth.id,
      startDate: tomorrow,
      endDate: tomorrow,
      $or: [{ leaveType: 'casual' }, { type: 'Casual' }],
      reason: 'Off tomorrow',
      status: { $in: ['pending', 'approved'] },
    });

    if (!offLeave) {
      return NextResponse.json({ ok: true, status: 'none', message: 'No off tomorrow request found' });
    }

    {
      const balance = await ensureLeaveBalance(auth.id) as any;
      const days = Number((offLeave as any).totalDays ?? (offLeave as any).days ?? 1);
      const safeDays = Number.isFinite(days) && days > 0 ? days : 1;
      const entry = balance.casual || { total: 12, used: 0, pending: 0 };
      if (offLeave.status === 'pending') {
        entry.pending = Math.max(0, Number(entry.pending || 0) - safeDays);
      }
      if (offLeave.status === 'approved') {
        entry.used = Math.max(0, Number(entry.used || 0) - safeDays);
      }
      balance.casual = entry;
      await balance.save();
    }

    offLeave.status = 'cancelled';
    await offLeave.save();

    // remove any legacy embedded off-tomorrow flag if present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leaves = Array.isArray((user as any).leaves) ? (user as any).leaves : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (user as any).leaves = leaves.filter((l: any) => !(l.date === tomorrow && l.type === 'day_off'));
    await user.save();

    return NextResponse.json({ ok: true, status: 'cancelled' });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
