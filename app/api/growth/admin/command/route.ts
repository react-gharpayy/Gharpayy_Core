import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import GrowthProfile from '@/models/GrowthProfile';
import Redemption from '@/models/Redemption';
import GrowthEvent from '@/models/GrowthEvent';
import CoinLedger from '@/models/CoinLedger';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const [
      totalUsers,
      totalCoins,
      pendingRedemptions,
      totalRedemptions,
      recentEvents
    ] = await Promise.all([
      GrowthProfile.countDocuments(),
      GrowthProfile.aggregate([{ $group: { _id: null, total: { $sum: "$coins" } } }]),
      Redemption.countDocuments({ status: 'pending' }),
      Redemption.countDocuments(),
      GrowthEvent.find().sort({ ts: -1 }).limit(10).lean()
    ]);

    // Simple suspicious activity check (e.g., users with > 100k coins or XP spikes)
    const suspiciousUsers = await GrowthProfile.find({
      $or: [
        { coins: { $gt: 50000 } },
        { xp: { $gt: 200000 } }
      ]
    }).limit(10).lean();

    return NextResponse.json({
      ok: true,
      stats: {
        totalUsers,
        circulatingCoins: totalCoins[0]?.total || 0,
        pendingRedemptions,
        totalRedemptions,
      },
      recentEvents,
      suspiciousUsers,
      config: {
        freezeEconomy: process.env.FREEZE_GROWTH_ECONOMY === 'true',
        engineActive: process.env.ENABLE_GROWTH_ENGINE === 'true'
      }
    });

  } catch (e: unknown) {
    console.error('Admin Growth Stats Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
