import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Reward from '@/models/Reward';
import { REWARD_CATALOG } from '@/lib/growth/reward-catalog';

const ALLOWED_ROLES = new Set(['admin', 'manager', 'hr']);

// Seed DB with catalog defaults if none exist
async function seedIfEmpty() {
  for (const r of REWARD_CATALOG) {
    const exists = await Reward.findOne({ rewardId: r.id });
    if (!exists) {
      await Reward.create({ ...r, rewardId: r.id, isCustom: false });
    }
  }
}

// GET /api/growth/admin/rewards
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || !ALLOWED_ROLES.has(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    await seedIfEmpty();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'active' | 'inactive' | 'all'
    const filter: Record<string, unknown> = {};
    if (status === 'active') filter.active = true;
    if (status === 'inactive') filter.active = false;

    const rewards = await Reward.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ ok: true, rewards });
  } catch (e) {
    console.error('/api/growth/admin/rewards GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/growth/admin/rewards — create new reward
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || !ALLOWED_ROLES.has(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const {
      title, description, category, rarity, coinCost,
      approvalRequired, cooldownDays, stockLimit, active, image
    } = body;

    if (!title || !description || !category || !rarity || coinCost === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rewardId = `rew-custom-${Date.now()}`;
    const reward = await Reward.create({
      rewardId,
      title,
      description,
      category,
      rarity,
      coinCost: Number(coinCost),
      approvalRequired: Boolean(approvalRequired),
      cooldownDays: Number(cooldownDays ?? 0),
      stockLimit: stockLimit ? Number(stockLimit) : undefined,
      active: active !== false,
      image,
      isCustom: true
    });

    return NextResponse.json({ ok: true, reward });
  } catch (e) {
    console.error('/api/growth/admin/rewards POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
