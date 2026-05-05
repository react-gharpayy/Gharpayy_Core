import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import AttendancePolicy from '@/models/AttendancePolicy';
import { getDefaultPolicy } from '@/lib/leave-utils';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const policy = await getDefaultPolicy();
    return NextResponse.json({ ok: true, policy });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    await connectDB();
    const policy = await AttendancePolicy.findOne({ isDefault: true });
    if (!policy) {
      const created = await AttendancePolicy.create({ name: 'Default Policy', isDefault: true, ...body });
      return NextResponse.json({ ok: true, policy: created });
    }
    Object.assign(policy, body);
    await policy.save();
    return NextResponse.json({ ok: true, policy });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
