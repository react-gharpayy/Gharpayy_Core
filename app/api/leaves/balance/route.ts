import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import LeaveBalance from '@/models/LeaveBalance';

// GET /api/leaves/balance?year=2026&employeeId=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const employeeIdParam = searchParams.get('employeeId');

    const targetId = (auth.role === 'admin' || auth.role === 'manager') && employeeIdParam && mongoose.Types.ObjectId.isValid(employeeIdParam)
      ? employeeIdParam
      : auth.id;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    await connectDB();
    const balance = await LeaveBalance.findOneAndUpdate(
      { employeeId: new mongoose.Types.ObjectId(targetId), year },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ ok: true, balance });
  } catch (e) {
    console.error('[leaves/balance GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/leaves/balance - admin update
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { employeeId, year, casual, sick, earned, comp_off } = body || {};

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const safeYear = Number.isFinite(Number(year)) ? Number(year) : new Date().getFullYear();

    await connectDB();
    const update: Record<string, unknown> = {};
    if (casual) update.casual = casual;
    if (sick) update.sick = sick;
    if (earned) update.earned = earned;
    if (comp_off) update.comp_off = comp_off;

    const balance = await LeaveBalance.findOneAndUpdate(
      { employeeId: new mongoose.Types.ObjectId(employeeId), year: safeYear },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ ok: true, balance });
  } catch (e) {
    console.error('[leaves/balance PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
