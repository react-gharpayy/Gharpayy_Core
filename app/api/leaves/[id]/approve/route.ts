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

    const balance = await ensureLeaveBalance(String(leave.employeeId)) as any;
    const days = Number((leave as any).totalDays || 0);
    const type = (leave as any).leaveType as string | undefined;

    const balanceTypes = ['casual', 'sick', 'earned', 'comp_off'] as const;
    if (type && balanceTypes.includes(type as typeof balanceTypes[number])) {
      const entry = balance[type] || { total: 0, used: 0, pending: 0 };
      const available = Number(entry.total || 0) - Number(entry.used || 0) - Number(entry.pending || 0);
      if (available < days) {
        return NextResponse.json({ error: `Insufficient ${type} leave balance` }, { status: 400 });
      }
      entry.pending = Math.max(0, Number(entry.pending || 0) - days);
      entry.used = Math.max(0, Number(entry.used || 0) + days);
      balance[type] = entry;
      await balance.save();
    }

    leave.status = 'approved';
    leave.reviewedAt = new Date();
    leave.reviewedBy = auth.id;
    leave.reviewedByName = auth.fullName || auth.email;
    await leave.save();

    if (leave.reason === 'Off tomorrow') {
      const emp = await User.findById(leave.employeeId).select('leaves');
      if (emp) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leaves = Array.isArray((emp as any).leaves) ? (emp as any).leaves : [];
        const exists = leaves.some((l: any) => l.date === leave.startDate && l.type === 'day_off');
        if (!exists) {
          leaves.push({ date: leave.startDate, type: 'day_off', status: 'approved' });
          (emp as any).leaves = leaves;
          await emp.save();
        }
      }
    }

    const updated = await LeaveBalance.findById(balance._id).lean();
    return NextResponse.json({ ok: true, leave, balance: updated });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
