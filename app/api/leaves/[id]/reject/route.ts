import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Leave from '@/models/Leave';
import User from '@/models/User';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role === 'employee') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const { reason } = await req.json().catch(() => ({}));

    await connectDB();
    const leave = await Leave.findById(id);
    if (!leave) return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    if (leave.status !== 'pending') return NextResponse.json({ error: 'Leave already processed' }, { status: 400 });

    if (auth.role === 'manager') {
      const emp = await User.findById(leave.employeeId).select('managerId').lean() as any;
      if (!emp || emp.managerId?.toString?.() !== auth.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    leave.status = 'rejected';
    leave.rejectedAt = new Date();
    leave.rejectedBy = auth.id;
    leave.rejectedReason = reason || '';
    await leave.save();

    return NextResponse.json({ ok: true, leave });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
