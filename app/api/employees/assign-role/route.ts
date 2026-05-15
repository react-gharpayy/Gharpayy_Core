import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { requirePermission } from '@/lib/permission-middleware';

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('MANAGE_ROLES');
    if (error) return error;

    const body = await req.json();
    const { employeeId, playbookRole } = body;

    if (!employeeId || !playbookRole) {
      return NextResponse.json({ error: 'Employee ID and Role required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(
      employeeId,
      { $set: { playbookRole } },
      { new: true }
    );

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ ok: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
