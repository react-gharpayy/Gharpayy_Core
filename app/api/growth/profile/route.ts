import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import GrowthProfile from '@/models/GrowthProfile';
import GrowthEvent from '@/models/GrowthEvent';
import Task from '@/models/Task';
import Kudo from '@/models/Kudo';
import Attendance from '@/models/Attendance';
import { calculateLevelProgress } from '@/lib/growth/xp-engine';
import { computeAchievements, UserStats } from '@/lib/growth/achievement-engine';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    if (process.env.ENABLE_GROWTH_ENGINE !== 'true') {
      return NextResponse.json({ error: 'Growth engine is disabled' }, { status: 403 });
    }

    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // SECTION 1: Fix Admin ObjectId Crashes
    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({
        ok: true,
        isAdmin: true,
        profile: { xp: 0, coins: 0, streakDays: 0, level: 1, progressPercentage: 0 },
        achievements: { total: 0, earned: 0, list: [] },
        recentEvents: []
      });
    }

    await connectDB();
    const userId = new mongoose.Types.ObjectId(auth.id);

    // 1. Fetch Growth Profile
    let profile = await GrowthProfile.findOne({ userId });
    if (!profile) {
      // Lazy initialization
      profile = await GrowthProfile.create({ 
        userId,
        xp: 0,
        level: 1,
        coins: 0,
        streakDays: 0,
        lastActiveDate: ''
      });
    }

    // 2. Aggregate Stats for Achievements
    // Note: In a high-traffic production environment, these counts should be cached or stored in GrowthProfile
    const [tasksCompleted, kudosReceived, attendanceDays] = await Promise.all([
      Task.countDocuments({ assignedTo: userId, status: 'completed' }),
      Kudo.countDocuments({ toId: auth.id }),
      Attendance.countDocuments({ employeeId: auth.id, workMode: 'Present' })
    ]);

    const stats: UserStats = {
      xp: profile.xp,
      level: profile.level,
      streakDays: profile.streakDays,
      tasksCompleted,
      kudosReceived,
      attendanceDays
    };

    // 3. Compute derived data
    const levelProgress = calculateLevelProgress(profile.xp);
    const achievements = computeAchievements(stats);
    
    // 4. Fetch recent events (limited)
    const recentEvents = await GrowthEvent.find({ userId })
      .sort({ ts: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      ok: true,
      profile: {
        xp: profile.xp,
        coins: profile.coins,
        streakDays: profile.streakDays,
        ...levelProgress
      },
      achievements: {
        total: achievements.length,
        earned: achievements.filter(a => a.earned).length,
        list: achievements
      },
      recentEvents
    });

  } catch (e: unknown) {
    console.error('API error in /api/growth/profile:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
