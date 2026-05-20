import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { getAuthUser, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.id === 'admin') {
      return NextResponse.json({ ok: true }); // Silent skip for admin/no-auth
    }

    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });

    await connectDB();
    
    // Informational only: update lastSeenAt regardless of activeSessionToken matching
    try {
      await User.updateOne(
        { _id: auth.id },
        { $set: { lastSeenAt: new Date() } }
      );
    } catch (dbError) {
      console.warn('[Heartbeat Warning] Failed to update user heartbeat metadata:', dbError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Heartbeat] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
