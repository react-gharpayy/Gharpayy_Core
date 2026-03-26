import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import User from '@/models/User';
import mongoose from 'mongoose';

function isValidTime(v: unknown) {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const targetId = (auth.role === 'admin' || auth.role === 'manager') && userId ? userId : auth.id;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await User.findById(targetId).select('fullName email role workSchedule').lean() as any;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ ok: true, user: {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      workSchedule: user.workSchedule || null,
    }});
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { startTime, endTime, breakDuration, userId } = body || {};
    const duration = Number(breakDuration);
    if (!isValidTime(startTime) || !isValidTime(endTime) || !Number.isFinite(duration) || duration < 0 || duration > 240) {
      return NextResponse.json({ error: 'Invalid schedule payload' }, { status: 400 });
    }

    let targetId = auth.id;
    const isAdminActor = auth.role === 'admin' || auth.role === 'manager';
    if (isAdminActor && userId) targetId = userId;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(targetId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing = user.workSchedule || {};
    if (!isAdminActor && (existing as Record<string, unknown>).isLocked) {
      return NextResponse.json({ error: 'Work schedule is locked. Contact admin.' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.workSchedule = {
      startTime,
      endTime,
      breakDuration: duration,
      isLocked: true,
      setBy: isAdminActor ? 'admin' : 'employee',
    } as any;

    await user.save();

    return NextResponse.json({ ok: true, workSchedule: user.workSchedule });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
