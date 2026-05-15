import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import GrowthProfile from '@/models/GrowthProfile';
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
    const type = searchParams.get('type') || 'xp'; // xp | coins | streak
    const scope = searchParams.get('scope') || 'org'; // org | team | hub
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    await connectDB();
    const isObjectIdUser = mongoose.Types.ObjectId.isValid(auth.id);

    // 1. Build User Filter based on scope
    const userFilter: any = { isApproved: { $ne: false } };
    if (isObjectIdUser && (scope === 'team' || scope === 'hub')) {
      const currentUser = await User.findById(auth.id).select('teamId officeZoneId').lean() as any;
      if (currentUser) {
        if (scope === 'team' && currentUser.teamId) {
          userFilter.teamId = currentUser.teamId;
        } else if (scope === 'hub' && currentUser.officeZoneId) {
          userFilter.officeZoneId = currentUser.officeZoneId;
        }
      }
    }

    // 2. Get eligible user IDs
    const eligibleUsers = await User.find(userFilter).select('_id').lean();
    const userIds = eligibleUsers.map(u => u._id);

    // 3. Query Growth Profiles
    const sortField = type === 'coins' ? 'coins' : (type === 'streak' ? 'streakDays' : 'xp');
    
    const [profiles, total] = await Promise.all([
      GrowthProfile.find({ userId: { $in: userIds } })
        .sort({ [sortField]: -1, userId: 1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'userId',
          select: 'fullName profilePhoto teamName role playbookRole',
          model: User
        })
        .lean(),
      GrowthProfile.countDocuments({ userId: { $in: userIds } })
    ]);

    // 4. Map to clean response (excluding sensitive fields)
    const leaderboard = profiles.map((p: any, index: number) => ({
      rank: skip + index + 1,
      userId: p.userId?._id,
      name: p.userId?.fullName || 'Anonymous',
      photo: p.userId?.profilePhoto,
      team: p.userId?.teamName,
      role: p.userId?.role,
      playbookRole: p.userId?.playbookRole,
      value: p[sortField],
      level: p.level
    }));

    // 5. Get current user's rank
    let userRank = null;
    if (isObjectIdUser) {
      const currentUserProfile = await GrowthProfile.findOne({ userId: auth.id }).lean();
      if (currentUserProfile) {
        const betterProfilesCount = await GrowthProfile.countDocuments({
          userId: { $in: userIds },
          [sortField]: { $gt: (currentUserProfile as any)[sortField] }
        });
        userRank = betterProfilesCount + 1;
      }
    }

    return NextResponse.json({
      ok: true,
      type,
      scope,
      page,
      limit,
      total,
      leaderboard,
      userRank
    });

  } catch (e: unknown) {
    console.error('API error in /api/growth/leaderboard:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
