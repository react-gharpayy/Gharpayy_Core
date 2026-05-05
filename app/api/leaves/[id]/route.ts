import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Leave from '@/models/Leave';
import LeaveBalance from '@/models/LeaveBalance';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/leaves/[id] — approve / reject (admin/manager) or cancel (employee own) */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid leave id' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const { action, reviewNote } = body as { action: string; reviewNote?: string };
    const validActions = ['approve', 'reject', 'cancel'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'action must be approve | reject | cancel' }, { status: 400 });
    }
    await connectDB();
    const leave = await Leave.findById(id);
    if (!leave) return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    // Auth checks
    if (action === 'cancel') {
      if (leave.employeeId.toString() !== user.id) {
        return NextResponse.json({ error: 'Cannot cancel another employee leave' }, { status: 403 });
      }
      if (!['pending', 'approved'].includes(leave.status)) {
        return NextResponse.json({ error: 'Cannot cancel this leave' }, { status: 400 });
      }
    } else {
      if (!['admin', 'manager'].includes(user.role)) {
        return NextResponse.json({ error: 'Only admin or manager can approve/reject' }, { status: 403 });
      }
    }
    const prevStatus = leave.status;
    const newStatus = action === 'approve' ? 'approved'
      : action === 'reject' ? 'rejected' : 'cancelled';
    leave.status = newStatus;
    leave.reviewedBy = user.id;
    leave.reviewedByName = user.fullName;
    leave.reviewNote = reviewNote || '';
    leave.reviewedAt = new Date();
    await leave.save();
    // Update balance
    const balanceTypes = ['casual', 'sick', 'earned', 'comp_off'] as const;
    if (balanceTypes.includes(leave.leaveType as typeof balanceTypes[number])) {
      const year = parseInt(leave.startDate.split('-')[0]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inc: Record<string, number> = {};
      if (action === 'approve') {
        inc[`${leave.leaveType}.pending`] = -leave.totalDays;
        inc[`${leave.leaveType}.used`] = leave.totalDays;
      } else if (action === 'reject' && prevStatus === 'pending') {
        inc[`${leave.leaveType}.pending`] = -leave.totalDays;
      } else if (action === 'cancel') {
        if (prevStatus === 'pending') inc[`${leave.leaveType}.pending`] = -leave.totalDays;
        if (prevStatus === 'approved') inc[`${leave.leaveType}.used`] = -leave.totalDays;
      }
      if (Object.keys(inc).length > 0) {
        await LeaveBalance.findOneAndUpdate(
          { employeeId: leave.employeeId, year },
          { $inc: inc }
        );
      }
    }
    return NextResponse.json({ ok: true, leave });
  } catch (e) {
    console.error('[leaves/[id] PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** GET /api/leaves/[id] — single leave detail */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid leave id' }, { status: 400 });
    }
    await connectDB();
    const leave = await Leave.findById(id).lean();
    if (!leave) return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (user.role === 'employee' && (leave as any).employeeId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ ok: true, leave });
  } catch (e) {
    console.error('[leaves/[id] GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
