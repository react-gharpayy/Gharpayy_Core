import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Leave from '@/models/Leave';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role === 'employee') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    let query: any = { status: 'pending' };

    if (auth.role === 'manager') {
      const teamEmployees = await User.find({ managerId: auth.id, role: 'employee' }, '_id').lean() as { _id: { toString: () => string } }[];
      const ids = teamEmployees.map(e => e._id);
      query = { ...query, employeeId: { $in: ids } };
    }

    const leaves = await Leave.find(query).sort({ appliedAt: -1 }).lean();
    return NextResponse.json({ ok: true, leaves });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
