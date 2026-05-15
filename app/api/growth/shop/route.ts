import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import GrowthProfile from '@/models/GrowthProfile';
import Reward from '@/models/Reward';
import { REWARD_CATALOG } from '@/lib/growth/reward-catalog';
import mongoose from 'mongoose';

// Seed DB if empty
async function seedIfEmpty() {
  for (const r of REWARD_CATALOG) {
    const exists = await Reward.findOne({ rewardId: r.id });
    if (!exists) {
      await Reward.create({ ...r, rewardId: r.id, isCustom: false });
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.ENABLE_GROWTH_ENGINE !== 'true') {
      return NextResponse.json({ error: 'Growth engine is disabled' }, { status: 403 });
    }

    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    await seedIfEmpty();

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      const rewards = await Reward.find({ active: true }).sort({ coinCost: 1 }).lean();
      return NextResponse.json({
        ok: true,
        rewards,
        userCoins: 0,
        isAdmin: true
      });
    }

    const userId = new mongoose.Types.ObjectId(auth.id);
    const profile = await GrowthProfile.findOne({ userId }).select('coins').lean();

    // Serve active rewards from DB (with catalog fallback already seeded)
    const rewards = await Reward.find({ active: true }).sort({ coinCost: 1 }).lean();

    return NextResponse.json({
      ok: true,
      rewards,
      userCoins: (profile as any)?.coins || 0
    });

  } catch (e: unknown) {
    console.error('API error in /api/growth/shop:', e);
    // Fallback to static catalog on DB error
    const { getActiveRewards } = await import('@/lib/growth/reward-catalog');
    return NextResponse.json({
      ok: true,
      rewards: getActiveRewards(),
      userCoins: 0
    });
  }
}
