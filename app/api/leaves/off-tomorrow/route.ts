import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import User from '@/models/User';
import mongoose from 'mongoose';
import { IST_OFFSET_MS } from '@/lib/constants';
import Leave from '@/models/Leave';
import { ensureLeaveBalance, getPolicyForUser, getHolidaysInRange, calculateLeaveDays } from '@/lib/leave-utils';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leaves = Array.isArray(user.leaves) ? user.leaves : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exists = leaves.some((l: any) => l.date === tomorrow && l.type === 'day_off');
    if (!exists) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leaves.push({ date: tomorrow, type: 'day_off', status: 'approved' } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user.leaves = leaves as any;
      await user.save();
    }

    await connectDB();
    const policy = await getPolicyForUser(auth.id);
    const holidays = await getHolidaysInRange(tomorrow, tomorrow);
    const weekOffs = Array.isArray(user.workSchedule?.weekOffs) && user.workSchedule.weekOffs.length > 0
      ? user.workSchedule.weekOffs
      : Array.isArray(policy?.weekOffs) ? policy.weekOffs : [];

    const days = calculateLeaveDays({
      startDate: tomorrow,
      endDate: tomorrow,
      weekOffs,
      holidays: holidays.map(h => h.date),
      holidayExclusionEnabled: policy?.holidayExclusionEnabled !== false,
      weeklyOffExclusionEnabled: policy?.weeklyOffExclusionEnabled !== false,
    });

    const existingLeave = await Leave.findOne({ employeeId: auth.id, startDate: tomorrow, endDate: tomorrow, type: 'Casual' });
    if (!existingLeave) {
      const balance = await ensureLeaveBalance(auth.id);
      await Leave.create({
        employeeId: auth.id,
        employeeName: user.fullName || auth.fullName || auth.email,
        type: 'Casual',
        startDate: tomorrow,
        endDate: tomorrow,
        days: days || 1,
        status: 'approved',
        reason: 'Off tomorrow',
        approvedAt: new Date(),
        approvedBy: auth.id,
        approvedByName: auth.fullName || auth.email,
      });
      if (Number(balance.casual || 0) >= (days || 1)) {
        balance.casual = Math.max(0, Number(balance.casual || 0) - (days || 1));
        await balance.save();
      }
    }

    return NextResponse.json({ ok: true, leave: { date: tomorrow, type: 'day_off', status: 'approved' } });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
