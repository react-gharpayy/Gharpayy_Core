import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import QuestProgress from '@/models/QuestProgress';
import GrowthProfile from '@/models/GrowthProfile';
import GrowthEvent from '@/models/GrowthEvent';
import CoinLedger from '@/models/CoinLedger';
import Quest from '@/models/Quest';
import { calculateLevelFromXP } from '@/lib/growth/xp-engine';
import { GrowthLogger } from '@/lib/growth/logger';
import { getISTDateStr, getISTWeekKey } from '@/lib/date-utils';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    if (process.env.ENABLE_GROWTH_ENGINE !== 'true') {
      return NextResponse.json({ error: 'Growth engine is disabled' }, { status: 403 });
    }

    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { questId } = await req.json();
    if (!questId) return NextResponse.json({ error: 'questId required' }, { status: 400 });

    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'Admins cannot participate in quests' }, { status: 403 });
    }
    const questDef: any = await Quest.findOne({ questId, active: true }).lean();
    if (!questDef) return NextResponse.json({ error: 'Quest not found or inactive' }, { status: 404 });

    const userId = new mongoose.Types.ObjectId(auth.id);
    const pk = questDef.kind === 'daily' ? getISTDateStr() : getISTWeekKey();

    // 1. Validate Completion and Not Claimed (Atomic Update)
    const progress = await QuestProgress.findOneAndUpdate(
      { 
        userId, 
        questId, 
        periodKey: pk, 
        count: { $gte: questDef.target },
        claimed: false 
      },
      { $set: { claimed: true } },
      { new: true }
    ).lean();

    if (!progress) {
      GrowthLogger.warn('QUEST_CLAIM_REJECTED', { userId: auth.id, questId, pk });
      return NextResponse.json({ 
        error: 'Quest not eligible for claim (not finished or already claimed)' 
      }, { status: 400 });
    }

    // 2. Award Rewards
    const profile = await GrowthProfile.findOne({ userId });
    if (!profile) {
      // Emergency rollback of claimed status if profile missing
      await QuestProgress.updateOne({ userId, questId, periodKey: pk }, { $set: { claimed: false } });
      return NextResponse.json({ error: 'Profile not found' }, { status: 500 });
    }

    const oldXP = profile.xp;
    const newXP = oldXP + questDef.xpAward;
    const oldLevel = profile.level;
    const newLevel = calculateLevelFromXP(newXP);

    profile.xp = newXP;
    profile.level = newLevel;
    profile.coins += questDef.coinAward;
    await profile.save();

    // 3. Log Events
    const event = await GrowthEvent.create({
      userId,
      event: `QUEST_${questDef.kind.toUpperCase()}_CLAIM`,
      xpAwarded: questDef.xpAward,
      sourceId: `${questId}_${pk}`,
      sourceType: 'quest_claim',
      note: `Claimed quest: ${questDef.title}`,
      ts: new Date()
    });

    await CoinLedger.create({
      userId,
      delta: questDef.coinAward,
      reason: `Quest Reward: ${questDef.title}`,
      relatedEventId: event._id,
      ts: new Date()
    });

    GrowthLogger.info('QUEST_CLAIMED', { userId: auth.id, questId, xp: questDef.xpAward, coins: questDef.coinAward });

    return NextResponse.json({
      ok: true,
      reward: {
        xp: questDef.xpAward,
        coins: questDef.coinAward,
        leveledUp: newLevel > oldLevel,
        newLevel: newLevel > oldLevel ? newLevel : undefined
      },
      profile: {
        xp: profile.xp,
        level: profile.level,
        coins: profile.coins
      }
    });

  } catch (e: unknown) {
    GrowthLogger.error('QUEST_CLAIM_ERROR', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
