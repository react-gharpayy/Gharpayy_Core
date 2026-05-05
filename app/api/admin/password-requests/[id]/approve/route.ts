import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import PasswordChangeRequest from '@/models/PasswordChangeRequest';
import User from '@/models/User';

export async function POST(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role === 'employee') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    await connectDB();
    const reqRow = await PasswordChangeRequest.findById(id);
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (reqRow.status !== 'pending') return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    if (reqRow.expiresAt && reqRow.expiresAt.getTime() < Date.now()) {
      reqRow.status = 'rejected';
      await reqRow.save();
      return NextResponse.json({ error: 'Request expired' }, { status: 400 });
    }

    if (auth.role === 'manager') {
      const target = await User.findById(reqRow.userId).select('managerId').lean() as { managerId?: { toString?: () => string } } | null;
      if (!target || target.managerId?.toString?.() !== auth.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    await User.findByIdAndUpdate(reqRow.userId, { password: reqRow.newPasswordHash });
    reqRow.status = 'approved';
    await reqRow.save();

    await PasswordChangeRequest.updateMany(
      { userId: reqRow.userId, status: 'pending', _id: { $ne: reqRow._id } },
      { $set: { status: 'rejected' } },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
