import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Reward from '@/models/Reward';

const ALLOWED_ROLES = new Set(['admin', 'manager', 'hr']);

// PATCH /api/growth/admin/rewards/[id] — edit reward
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuthUser();
    if (!auth || !ALLOWED_ROLES.has(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const allowedFields = [
      'title', 'description', 'category', 'rarity',
      'coinCost', 'approvalRequired', 'cooldownDays',
      'stockLimit', 'active', 'image'
    ];

    const update: Record<string, unknown> = {};
    for (const f of allowedFields) {
      if (f in body) update[f] = body[f];
    }

    const reward = await Reward.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();

    if (!reward) return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    return NextResponse.json({ ok: true, reward });
  } catch (e) {
    console.error('/api/growth/admin/rewards/[id] PATCH error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/growth/admin/rewards/[id] — archive (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuthUser();
    if (!auth || !ALLOWED_ROLES.has(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const reward = await Reward.findByIdAndUpdate(
      id,
      { $set: { active: false } },
      { new: true }
    ).lean();

    if (!reward) return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    return NextResponse.json({ ok: true, message: 'Reward archived' });
  } catch (e) {
    console.error('/api/growth/admin/rewards/[id] DELETE error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
