import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Leave from '@/models/Leave';
import { calculateLeaveDays, ensureLeaveBalance, getHolidaysInRange, getPolicyForUser } from '@/lib/leave-utils';
import User from '@/models/User';

const LEAVE_TYPES = ['Paid','Sick','Casual','Comp Off','LOP'] as const;

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role === 'admin') return NextResponse.json({ error: 'Admin cannot apply leave' }, { status: 403 });

    const { startDate, endDate, type, reason } = await req.json();
    if (!startDate || !endDate || !type) return NextResponse.json({ error: 'startDate, endDate, type required' }, { status: 400 });
    if (startDate > endDate) return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 });
    if (!LEAVE_TYPES.includes(type)) return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 });

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(auth.id).select('fullName workSchedule').lean() as any;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const policy = await getPolicyForUser(auth.id);
    const holidays = await getHolidaysInRange(startDate, endDate);
    const holidayDates = holidays.map(h => h.date);
    const weekOffs = Array.isArray(user?.workSchedule?.weekOffs) && user.workSchedule.weekOffs.length > 0
      ? user.workSchedule.weekOffs
      : Array.isArray(policy?.weekOffs) ? policy.weekOffs : [];

    const days = calculateLeaveDays({
      startDate,
      endDate,
      weekOffs,
      holidays: holidayDates,
      holidayExclusionEnabled: policy?.holidayExclusionEnabled !== false,
      weeklyOffExclusionEnabled: policy?.weeklyOffExclusionEnabled !== false,
    });

    if (days <= 0) return NextResponse.json({ error: 'No payable leave days in selected range' }, { status: 400 });

    await ensureLeaveBalance(auth.id);

    const leave = await Leave.create({
      employeeId: auth.id,
      employeeName: user.fullName || auth.fullName || auth.email,
      type,
      startDate,
      endDate,
      days,
      status: 'pending',
      reason: reason || '',
    });

    return NextResponse.json({ ok: true, leave });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
