import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import PasswordChangeRequest from '@/models/PasswordChangeRequest';
import User from '@/models/User';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role === 'employee') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const now = new Date();
    let rows = await PasswordChangeRequest.find({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort({ createdAt: -1 }).lean() as any[];

    const userIds = rows.map(r => r.userId);
    const users = await User.find({ _id: { $in: userIds } }, 'fullName email').lean() as any[];
    const uMap = new Map(users.map(u => [u._id.toString(), u]));

    if (auth.role === 'manager') {
      const teamEmployees = await User.find({ managerId: auth.id, role: 'employee' }, '_id').lean() as { _id: { toString: () => string } }[];
      const teamIds = new Set(teamEmployees.map(e => e._id.toString()));
      rows = rows.filter(r => teamIds.has(r.userId.toString()));
    }

    const requests = rows.map(r => ({
      _id: r._id.toString(),
      userId: r.userId.toString(),
      employeeName: uMap.get(r.userId.toString())?.fullName || 'Employee',
      employeeEmail: uMap.get(r.userId.toString())?.email || '',
      status: r.status,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ ok: true, requests });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

