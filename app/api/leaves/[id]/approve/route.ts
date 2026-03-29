import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Leave from '@/models/Leave';
import LeaveBalance from '@/models/LeaveBalance';
import User from '@/models/User';
import { ensureLeaveBalance } from '@/lib/leave-utils';

export async function POST(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role === 'employee') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

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

    const balance = await ensureLeaveBalance(String(leave.employeeId));
    const days = Number(leave.days || 0);

    if (leave.type === 'Paid' && Number(balance.paid || 0) < days) {
      return NextResponse.json({ error: 'Insufficient paid leave balance' }, { status: 400 });
    }
    if (leave.type === 'Sick' && Number(balance.sick || 0) < days) {
      return NextResponse.json({ error: 'Insufficient sick leave balance' }, { status: 400 });
    }
    if (leave.type === 'Casual' && Number(balance.casual || 0) < days) {
      return NextResponse.json({ error: 'Insufficient casual leave balance' }, { status: 400 });
    }
    if (leave.type === 'Comp Off' && Number(balance.compOff || 0) < days) {
      return NextResponse.json({ error: 'Insufficient comp off balance' }, { status: 400 });
    }

    if (leave.type === 'Paid') balance.paid = Math.max(0, Number(balance.paid || 0) - days);
    if (leave.type === 'Sick') balance.sick = Math.max(0, Number(balance.sick || 0) - days);
    if (leave.type === 'Casual') balance.casual = Math.max(0, Number(balance.casual || 0) - days);
    if (leave.type === 'Comp Off') balance.compOff = Math.max(0, Number(balance.compOff || 0) - days);
    if (leave.type === 'LOP') balance.lop = Number(balance.lop || 0) + days;
    await balance.save();

    leave.status = 'approved';
    leave.approvedAt = new Date();
    leave.approvedBy = auth.id;
    leave.approvedByName = auth.fullName || auth.email;
    await leave.save();

    const updated = await LeaveBalance.findById(balance._id).lean();
    return NextResponse.json({ ok: true, leave, balance: updated });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
