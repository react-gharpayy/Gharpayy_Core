import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import LeaveBalance from '@/models/LeaveBalance';
import mongoose from 'mongoose';
import { ensureLeaveBalance } from '@/lib/leave-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || auth.id;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }
    if (auth.role === 'employee' && employeeId !== auth.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const balance = await ensureLeaveBalance(employeeId);
    const data = await LeaveBalance.findById(balance._id).lean();
    return NextResponse.json({ ok: true, balance: data });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { employeeId, paid, sick, casual, compOff, lop, encashable, encashed, ratePerDay } = await req.json();
    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    await connectDB();
    const balance = await ensureLeaveBalance(employeeId);
    if (paid !== undefined) balance.paid = Number(paid);
    if (sick !== undefined) balance.sick = Number(sick);
    if (casual !== undefined) balance.casual = Number(casual);
    if (compOff !== undefined) balance.compOff = Number(compOff);
    if (lop !== undefined) balance.lop = Number(lop);
    if (encashable !== undefined) balance.encashable = Number(encashable);
    if (encashed !== undefined) balance.encashed = Number(encashed);
    if (ratePerDay !== undefined) balance.ratePerDay = Number(ratePerDay);
    await balance.save();

    const updated = await LeaveBalance.findById(balance._id).lean();
    return NextResponse.json({ ok: true, balance: updated });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
