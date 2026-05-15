import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Redemption from '@/models/Redemption';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    if (process.env.ENABLE_GROWTH_ENGINE !== 'true') {
      return NextResponse.json({ error: 'Growth engine is disabled' }, { status: 403 });
    }

    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    await connectDB();

    const query: any = {};
    const isAdmin = auth.role === 'admin' || auth.role === 'manager';

    if (!isAdmin) {
      // Employees see only their own
      query.userId = auth.id;
    } else {
      // Admins can filter by user or status
      const targetUserId = searchParams.get('userId');
      if (targetUserId) query.userId = targetUserId;
      if (status) query.status = status;
    }

    const [redemptions, total] = await Promise.all([
      Redemption.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'userId',
          select: 'fullName email teamName profilePhoto',
          model: User
        })
        .lean(),
      Redemption.countDocuments(query)
    ]);

    return NextResponse.json({
      ok: true,
      redemptions,
      total,
      page,
      limit
    });

  } catch (e: unknown) {
    console.error('API error in /api/growth/redemptions:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
