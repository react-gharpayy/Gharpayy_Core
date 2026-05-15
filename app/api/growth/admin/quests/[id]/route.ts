import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Quest from '@/models/Quest';

const ALLOWED_ROLES = new Set(['admin', 'manager', 'hr']);

// PATCH /api/growth/admin/quests/[id] - edit quest
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
      'title', 'description', 'kind', 'target',
      'metric', 'xpAward', 'coinAward', 'active'
    ];

    const update: Record<string, any> = {};
    for (const f of allowedFields) {
      if (f in body) update[f] = body[f];
    }

    const quest = await Quest.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).lean();

    if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    return NextResponse.json({ ok: true, quest });
  } catch (e) {
    console.error('/api/growth/admin/quests/[id] PATCH error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/growth/admin/quests/[id] - archive (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuthUser();
    if (!auth || !ALLOWED_ROLES.has(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const quest = await Quest.findByIdAndUpdate(
      id,
      { $set: { active: false } },
      { new: true }
    ).lean();

    if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    return NextResponse.json({ ok: true, message: 'Quest archived' });
  } catch (e) {
    console.error('/api/growth/admin/quests/[id] DELETE error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
