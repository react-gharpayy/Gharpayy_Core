import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Leave from '@/models/Leave';
import LeaveBalance from '@/models/LeaveBalance';
import { ZodError, z } from 'zod';

const applyLeaveSchema = z.object({
  leaveType: z.enum(['casual', 'sick', 'earned', 'comp_off', 'lop', 'other']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalDays: z.number().min(0.5).max(90),
  reason:    z.string().min(1).max(500).trim(),
  isHalfDay: z.boolean().optional().default(false),
  halfDaySession: z.enum(['morning', 'afternoon']).optional(),
});

/** GET /api/leaves
 * Employee: own leaves. Admin/manager: all (optionally ?employeeId=)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const employeeId   = searchParams.get('employeeId');
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (user.role === 'employee' || user.role === 'sub_admin') {
      query.employeeId = new mongoose.Types.ObjectId(user.id);
    } else if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query.employeeId = new mongoose.Types.ObjectId(employeeId);
    }
    if (statusFilter) query.status = statusFilter;

    const [leaves, total] = await Promise.all([
      Leave.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Leave.countDocuments(query),
    ]);
    return NextResponse.json({ ok: true, leaves, total, page, limit });
  } catch (e) {
    console.error('[leaves GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/leaves — Apply for leave (employee only) */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'employee') {
      return NextResponse.json({ error: 'Only employees can apply for leave' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    let parsed;
    try { parsed = applyLeaveSchema.parse(body); }
    catch (e) {
      if (e instanceof ZodError) return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
      throw e;
    }
    if (parsed.startDate > parsed.endDate) {
      return NextResponse.json({ error: 'startDate must be <= endDate' }, { status: 400 });
    }
    await connectDB();
    const year = parseInt(parsed.startDate.split('-')[0]);
    // Ensure balance record exists
    await LeaveBalance.findOneAndUpdate(
      { employeeId: new mongoose.Types.ObjectId(user.id), year },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const leave = await Leave.create({
      employeeId:      new mongoose.Types.ObjectId(user.id),
      employeeName:    user.fullName,
      leaveType:       parsed.leaveType,
      startDate:       parsed.startDate,
      endDate:         parsed.endDate,
      totalDays:       parsed.totalDays,
      reason:          parsed.reason,
      isHalfDay:       parsed.isHalfDay ?? false,
      halfDaySession:  parsed.halfDaySession ?? null,
    });
    // Mark pending days in balance
    if (['casual', 'sick', 'earned', 'comp_off'].includes(parsed.leaveType)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inc: Record<string, number> = {};
      inc[`${parsed.leaveType}.pending`] = parsed.totalDays;
      await LeaveBalance.findOneAndUpdate(
        { employeeId: new mongoose.Types.ObjectId(user.id), year },
        { $inc: inc }
      );
    }
    return NextResponse.json({ ok: true, leave }, { status: 201 });
  } catch (e) {
    console.error('[leaves POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
