import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import GrowthProfile from '@/models/GrowthProfile';
import GrowthEvent from '@/models/GrowthEvent';
import Redemption from '@/models/Redemption';
import QuestProgress from '@/models/QuestProgress';
import Quest from '@/models/Quest';

const ALLOWED_ROLES = new Set(['admin', 'manager', 'hr']);

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || !ALLOWED_ROLES.has(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    // 1. Circulating Coins
    const profiles = await GrowthProfile.find({}).select('coins').lean();
    const totalCoins = profiles.reduce((sum, p) => sum + (p.coins || 0), 0);
    const avgCoins = profiles.length > 0 ? Math.round(totalCoins / profiles.length) : 0;

    // 2. XP/day (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const xpHistory = await GrowthEvent.aggregate([
      { $match: { ts: { $gte: sevenDaysAgo } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } },
          totalXP: { $sum: "$xpAwarded" },
          eventCount: { $sum: 1 }
        } 
      },
      { $sort: { "_id": 1 } }
    ]);

    // 3. Quest Completion Rates (Current Period)
    const totalQuests = await Quest.countDocuments({ active: true });
    const activeProgress = await QuestProgress.countDocuments({ 
       // We'll just look at any progress in the last 7 days for a broad view
       updatedAt: { $gte: sevenDaysAgo }
    });
    const totalClaims = await QuestProgress.countDocuments({
      claimed: true,
      updatedAt: { $gte: sevenDaysAgo }
    });

    // 4. Redemption Trends
    const redemptions = await Redemption.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalValue: { $sum: "$coinCost" }
        }
      }
    ]);

    // 5. Suspicious Activity (Lightweight)
    // - High XP single awards (> 500)
    // - Rapid redemptions
    const suspiciousXP = await GrowthEvent.find({ xpAwarded: { $gt: 500 } })
      .sort({ ts: -1 })
      .limit(10)
      .populate('userId', 'fullName profilePhoto')
      .lean();

    return NextResponse.json({
      ok: true,
      summary: {
        economy: {
          totalCoins,
          avgCoins,
          activeUsers: profiles.length
        },
        activity: {
          xpHistory,
          totalClaims,
          activeProgress
        },
        redemptions,
        suspiciousXP
      }
    });

  } catch (e) {
    console.error('/api/growth/admin/analytics GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
