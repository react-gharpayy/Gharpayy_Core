import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Notice from '@/models/Notice';
import { getAuthUser } from '@/lib/auth';

// POST - mark notice as read
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, noticeId } = await req.json();
    const targetId = id || noticeId;
    if (!targetId) return NextResponse.json({ error: 'Notice ID required' }, { status: 400 });
    await connectDB();

    await Notice.findByIdAndUpdate(targetId, {
      $addToSet: { readBy: user.id }
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
