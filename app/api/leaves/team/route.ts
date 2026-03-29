import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Leave from '@/models/Leave';
import User from '@/models/User';
import { getISTDateStr } from '@/lib/attendance-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || getISTDateStr();
    const to = searchParams.get('to') || from;

    await connectDB();

    let employeeIds: string[] = [];
    if (auth.role === 'manager') {
      const teamEmployees = await User.find({ managerId: auth.id, role: 'employee' }, '_id').lean() as { _id: { toString: () => string } }[];
      employeeIds = teamEmployees.map(e => e._id.toString());
    } else if (auth.role === 'employee') {
      const me = await User.findById(auth.id).select('managerId').lean() as any;
      if (me?.managerId) {
        const teamEmployees = await User.find({ managerId: me.managerId, role: 'employee' }, '_id fullName').lean() as any[];
        employeeIds = teamEmployees.map(e => e._id.toString());
      } else {
        employeeIds = [auth.id];
      }
    } else {
      const all = await User.find({ role: 'employee' }, '_id').lean() as { _id: { toString: () => string } }[];
      employeeIds = all.map(e => e._id.toString());
    }

    const leaves = await Leave.find({
      employeeId: { $in: employeeIds },
      status: 'approved',
      $or: [
        { startDate: { $lte: to }, endDate: { $gte: from } },
      ],
    }).sort({ startDate: 1 }).lean();

    return NextResponse.json({ ok: true, leaves });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
