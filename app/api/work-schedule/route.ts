import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import User from '@/models/User';
import mongoose from 'mongoose';
import { SHIFT_TEMPLATES, ShiftType, WEEK_DAYS } from '@/lib/shift-templates';

function isValidTime(v: unknown) {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const targetId = auth.role === 'admin' && userId ? userId : auth.id;

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
    const { shiftType, startTime, endTime, breaks, weekOffs, userId, userIds } = body || {};
    const type = (shiftType || 'CUSTOM') as ShiftType;
    const isCustom = type === 'CUSTOM';
    const isKnown = type === 'CUSTOM' || type === 'FT_MAIN' || type === 'FT_EARLY' || type === 'INTERN_DAY';
    if (!isKnown) return NextResponse.json({ error: 'Invalid shiftType' }, { status: 400 });

    let finalStart = '';
    let finalEnd = '';
    let finalBreaks: { name: string; start: string; end: string; durationMinutes: number }[] = [];
    let finalWeekOffs: string[] = [];

    if (!isCustom) {
      const tmpl = SHIFT_TEMPLATES[type as Exclude<ShiftType, 'CUSTOM'>];
      finalStart = tmpl.workStart;
      finalEnd = tmpl.workEnd;
      finalBreaks = tmpl.breaks;
      finalWeekOffs = tmpl.weekOffs;
    } else {
      finalStart = startTime || '';
      finalEnd = endTime || '';
      finalBreaks = Array.isArray(breaks) ? breaks : [];
      finalWeekOffs = Array.isArray(weekOffs) ? weekOffs : [];
    }

    if (Array.isArray(weekOffs)) {
      finalWeekOffs = weekOffs;
    }

    if (!isValidTime(finalStart) || !isValidTime(finalEnd)) {
      return NextResponse.json({ error: 'Invalid schedule payload' }, { status: 400 });
    }
    for (const b of finalBreaks) {
      if (!b || !isValidTime(b.start) || !isValidTime(b.end) || !Number.isFinite(Number(b.durationMinutes))) {
        return NextResponse.json({ error: 'Invalid break schedule' }, { status: 400 });
      }
    }
    if (finalWeekOffs.length > 0 && finalWeekOffs.some((d: string) => !WEEK_DAYS.includes(d))) {
      return NextResponse.json({ error: 'Invalid week off day' }, { status: 400 });
    }

    let targetId = auth.id;
    const isAdminActor = auth.role === 'admin';
    if (isAdminActor && userId) targetId = userId;

    const hasBulk = Array.isArray(userIds);
    const bulkIds = hasBulk ? userIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id)) : [];
    const isBulk = isAdminActor && bulkIds.length > 0;
    if (hasBulk && bulkIds.length === 0) {
      return NextResponse.json({ error: 'No valid employee IDs provided' }, { status: 400 });
    }

    if (!isBulk && !mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakDuration = finalBreaks.reduce((sum, b) => sum + Number(b.durationMinutes || 0), 0);
    const payload = {
      shiftType: type,
      startTime: finalStart,
      endTime: finalEnd,
      breakDuration,
      breaks: finalBreaks,
      weekOffs: finalWeekOffs,
      isCustomShift: isCustom,
      isLocked: true,
      setBy: isAdminActor ? 'admin' : 'employee',
    } as any;

    if (isBulk) {
      const result = await User.updateMany({ _id: { $in: bulkIds } }, { $set: { workSchedule: payload } });
      return NextResponse.json({ ok: true, updated: result.modifiedCount, workSchedule: payload });
    }

    const user = await User.findById(targetId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing = user.workSchedule || {};
    if (!isAdminActor && (existing as Record<string, unknown>).isLocked) {
      return NextResponse.json({ error: 'Work schedule is locked. Contact admin.' }, { status: 403 });
    }

    user.workSchedule = payload;
    await user.save();

    return NextResponse.json({ ok: true, workSchedule: user.workSchedule });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
