import { connectDB } from './db';
import GrowthProfile from '@/models/GrowthProfile';
import GrowthEvent from '@/models/GrowthEvent';
import QuestProgress from '@/models/QuestProgress';
import Quest from '@/models/Quest';
import CoinLedger from '@/models/CoinLedger';
import { XP_EVENTS, XPEventKey } from './growth/quest-definitions';
import { calculateAwardedXP, calculateLevelFromXP } from './growth/xp-engine';
import { GrowthLogger } from './growth/logger';
import { getISTDateStr, getISTWeekKey } from './date-utils';
import { NotificationService } from '@/modules/notifications/notification.service';
import mongoose from 'mongoose';

/**
 * Gharpayy Growth Event Emitter
 * Safe, non-blocking, and idempotent event processing.
 */

export interface GrowthEventPayload {
  userId: string;
  event: XPEventKey | string;
  sourceId: string;
  sourceType: string;
  amount?: number;
  note?: string;
}

/**
 * Emit a growth event. This is fire-and-forget.
 * Failures here will NEVER affect the parent business logic.
 */
export function emitGrowthEvent(payload: GrowthEventPayload) {
  if (process.env.ENABLE_GROWTH_ENGINE !== 'true') return;
  if (!mongoose.Types.ObjectId.isValid(payload.userId)) return;

  // Background execution
  (async () => {
    try {
      await connectDB();
      const { userId, event, sourceId, sourceType, amount, note } = payload;

      if (!userId || !event || !sourceId) {
        GrowthLogger.warn('INVALID_EVENT_PAYLOAD', { payload });
        return;
      }

      // 1. Idempotency Check (Duplicate Event Protection)
      const existing = await GrowthEvent.findOne({ sourceId, event }).lean();
      if (existing) {
        console.log('>>> [GROWTH] Duplicate event detected. Skipping.');
        return;
      }

      // 2. Fetch/Create Growth Profile
      let profile = await GrowthProfile.findOne({ userId });
      if (!profile) {
        console.log('>>> [GROWTH] Profile NOT found. Creating new for:', userId);
        profile = await GrowthProfile.create({ 
          userId: new mongoose.Types.ObjectId(userId),
          lastActiveDate: getISTDateStr(),
          streakDays: 1,
          xp: 0,
          coins: 0,
          level: 1
        });
      }

      // 3. Update Streak Logic
      const today = getISTDateStr();
      const week = getISTWeekKey();
      
      if (profile.lastActiveDate !== today) {
        const yesterday = getISTDateStr(new Date(Date.now() - 86400000));
        if (profile.lastActiveDate === yesterday) {
          profile.streakDays += 1;
        } else {
          profile.streakDays = 1;
        }
        profile.lastActiveDate = today;
      }

      // 4. Calculate XP
      const baseAmount = amount ?? (XP_EVENTS as any)[event] ?? 0;
      const awardedXP = calculateAwardedXP(baseAmount, profile.streakDays);
      console.log('>>> [GROWTH] XP Awarded:', awardedXP, '(base:', baseAmount, ')');

      // 5. Create Event Record
      const growthEvent = await GrowthEvent.create({
        userId: new mongoose.Types.ObjectId(userId),
        event,
        xpAwarded: awardedXP,
        sourceId,
        sourceType,
        note,
        ts: new Date()
      });

      // 6. Update Profile XP and Level
      const oldLevel = profile.level;
      profile.xp += awardedXP;
      profile.level = calculateLevelFromXP(profile.xp);
      await profile.save();
      console.log('>>> [GROWTH] Profile updated. New XP:', profile.xp, 'Level:', profile.level);

      // 7. Map events to quest metrics
      const METRIC_MAP: Record<string, string[]> = {
        PERFECT_ATTENDANCE: ['ontime_checkin'],
        TASK_CLOSED: ['tasks_closed'],
        TASK_CLOSED_EARLY: ['tasks_closed'],
        EOD_REPORT_SHIPPED: ['eod_submitted'],
        KUDO_GIVEN: ['kudo_given'],
        ONE_ON_ONE_DONE: ['coaching_done'],
        TRACKER_SUBMITTED: ['eod_submitted']
      };

      const metricsToMatch = METRIC_MAP[event] || [];

      const matchingQuests = await Quest.find({ 
        active: true, 
        $or: [{ metric: { $in: metricsToMatch } }, { questId: event }] 
      }).lean();

      for (const quest of matchingQuests) {
        const periodKey = quest.kind === 'daily' ? today : week;
        
        const progress = await QuestProgress.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId), questId: quest.questId, periodKey },
          { $inc: { count: 1 } },
          { upsert: true, new: true }
        );

        // 8. Detect Quest Completion and Award Rewards
        if (progress.count >= quest.target && !progress.claimed) {
          progress.claimed = true;
          await progress.save();

          // Award XP and Coins to Profile
          profile.xp += quest.xpAward;
          profile.coins += quest.coinAward;
          profile.level = calculateLevelFromXP(profile.xp);
          await profile.save();

          // Log Coin Transaction
          await CoinLedger.create({
            userId: new mongoose.Types.ObjectId(userId),
            delta: quest.coinAward,
            reason: `Quest Completed: ${quest.title}`,
            relatedEventId: growthEvent._id,
            ts: new Date()
          });

          // 9. Feedback: Send Real-time Notification
          await NotificationService.createNotification({
            userId,
            type: 'SYSTEM',
            title: 'Quest Completed! 🏆',
            message: `You earned ${quest.xpAward} XP and ${quest.coinAward} Coins for completing "${quest.title}"!`,
            link: '/growth/quests',
            metadata: { 
              type: 'quest_completion', 
              questId: quest.questId,
              xp: quest.xpAward,
              coins: quest.coinAward
            }
          });

          GrowthLogger.info('QUEST_AUTO_COMPLETED', { userId, questId: quest.questId, xp: quest.xpAward, coins: quest.coinAward });
        }
      }

      // 10. Level up notification
      if (profile.level > oldLevel) {
        console.log('>>> [GROWTH] LEVEL UP!', profile.level);
        await NotificationService.createNotification({
          userId,
          type: 'SYSTEM',
          title: 'Level Up! 🎊',
          message: `Congratulations! You've reached Level ${profile.level}!`,
          link: '/growth/profile',
          metadata: { type: 'level_up', level: profile.level }
        });
      }

      console.log('>>> [GROWTH] Event processing complete.');
      GrowthLogger.info('EVENT_PROCESSED', { userId, event, xp: awardedXP });

    } catch (error) {
      console.error('>>> [GROWTH] ERROR in pipeline:', error);
      GrowthLogger.error('EVENT_PROCESS_FAILED', error, { payload });
    }
  })();
}
