import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import WeeklyTracker from '@/models/WeeklyTracker';
import User from '@/models/User';
import { buildEmployeeFilter } from '@/lib/role-guards';
import { getCurrentWeekInfo, getWeekRange } from '@/lib/week-utils';

function parseNumber(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'manager' && auth.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const nowInfo = getCurrentWeekInfo();
    const year = parseNumber(searchParams.get('year'), nowInfo.year);
    const weekNumber = parseNumber(searchParams.get('week'), nowInfo.weekNumber);

    const empFilter = buildEmployeeFilter(auth, { isApproved: { $ne: false } });
    if (empFilter === null) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    await connectDB();
    const users = await User.find(empFilter).select('_id fullName role teamName department').lean() as any[];
    const totalEmployees = users.length;
    const userIds = users.map(u => u._id);

    const roleTotals: Record<string, number> = {};
    const teamTotals: Record<string, number> = {};
    users.forEach(u => {
      roleTotals[u.role] = (roleTotals[u.role] || 0) + 1;
      const team = u.teamName || 'Unassigned';
      teamTotals[team] = (teamTotals[team] || 0) + 1;
    });

    const submittedWeek = await WeeklyTracker.countDocuments({
      year,
      weekNumber,
      employeeId: { $in: userIds },
      status: { $in: ['submitted', 'reviewed'] },
    });
    const goodWeeks = await WeeklyTracker.countDocuments({
      year,
      weekNumber,
      employeeId: { $in: userIds },
      isGoodWeek: true,
    });
    const pendingReviews = await WeeklyTracker.countDocuments({
      year,
      weekNumber,
      employeeId: { $in: userIds },
      status: 'submitted',
    });

    const missingWeek = Math.max(0, totalEmployees - submittedWeek);
    const complianceWeek = totalEmployees > 0 ? Math.round((submittedWeek / totalEmployees) * 100) : 0;

    const lastWeeks: number[] = [];
    for (let w = Math.max(1, weekNumber - 3); w <= weekNumber; w += 1) lastWeeks.push(w);
    const expectedLast4 = totalEmployees * lastWeeks.length;
    const submittedLast4 = await WeeklyTracker.countDocuments({
      year,
      weekNumber: { $in: lastWeeks },
      employeeId: { $in: userIds },
      status: { $in: ['submitted', 'reviewed'] },
    });
    const complianceLast4 = expectedLast4 > 0 ? Math.round((submittedLast4 / expectedLast4) * 100) : 0;

    const trendWeeks = [];
    for (let w = Math.max(1, weekNumber - 7); w <= weekNumber; w += 1) trendWeeks.push(w);
    const trendCounts = await WeeklyTracker.aggregate([
      { $match: { year, weekNumber: { $in: trendWeeks }, employeeId: { $in: userIds }, status: { $in: ['submitted', 'reviewed'] } } },
      { $group: { _id: '$weekNumber', submitted: { $sum: 1 } } },
    ]);
    const trendMap = new Map(trendCounts.map((r: any) => [r._id, r.submitted]));
    const trend = trendWeeks.map(w => ({
      weekNumber: w,
      range: getWeekRange(year, w),
      submitted: trendMap.get(w) || 0,
      compliance: totalEmployees > 0 ? Math.round(((trendMap.get(w) || 0) / totalEmployees) * 100) : 0,
    }));

    const roleAgg = await WeeklyTracker.aggregate([
      { $match: { year, weekNumber, employeeId: { $in: userIds }, status: { $in: ['submitted', 'reviewed'] } } },
      { $group: { _id: '$role', submitted: { $sum: 1 } } },
    ]);
    const roleWise = Object.entries(roleTotals).map(([role, total]) => {
      const found = roleAgg.find((r: any) => r._id === role);
      const submitted = found?.submitted || 0;
      return { role, total, submitted, compliance: total > 0 ? Math.round((submitted / total) * 100) : 0 };
    });

    const teamAgg = await WeeklyTracker.aggregate([
      { $match: { year, weekNumber, employeeId: { $in: userIds }, status: { $in: ['submitted', 'reviewed'] } } },
      { $group: { _id: '$teamName', submitted: { $sum: 1 } } },
    ]);
    const teamWise = Object.entries(teamTotals).map(([team, total]) => {
      const found = teamAgg.find((r: any) => r._id === team);
      const submitted = found?.submitted || 0;
      return { team, total, submitted, compliance: total > 0 ? Math.round((submitted / total) * 100) : 0 };
    });

    const weekTrackers = await WeeklyTracker.find({ year, weekNumber, employeeId: { $in: userIds } }).lean() as any[];
    const sumMetric = (key: string) => weekTrackers.reduce((acc, t) => acc + Number(t?.[key] || 0), 0);
    const metrics = {
      drafts30: sumMetric('drafts30'),
      mytAdded: sumMetric('mytAdded'),
      toursPipeline: sumMetric('toursPipeline'),
      toursDone: sumMetric('toursDone'),
      callsDone: sumMetric('callsDone'),
      connected: sumMetric('connected'),
    };

    const last4Agg = await WeeklyTracker.aggregate([
      { $match: { year, weekNumber: { $in: lastWeeks }, employeeId: { $in: userIds }, status: { $in: ['submitted', 'reviewed'] } } },
      { $group: { _id: '$employeeId', submitted: { $sum: 1 } } },
      { $sort: { submitted: -1 } },
      { $limit: 10 },
    ]);
    const topSubmitters = last4Agg.map((r: any) => {
      const u = users.find(x => String(x._id) === String(r._id));
      return { employeeId: String(r._id), name: u?.fullName || 'Unknown', submitted: r.submitted || 0 };
    });

    const perEmpAgg = await WeeklyTracker.aggregate([
      { $match: { year, weekNumber: { $in: lastWeeks }, employeeId: { $in: userIds }, status: { $in: ['submitted', 'reviewed'] } } },
      { $group: { _id: '$employeeId', submitted: { $sum: 1 } } },
    ]);
    const submittedMap = new Map(perEmpAgg.map((r: any) => [String(r._id), r.submitted]));
    const repeatMissing = users
      .map(u => {
        const submitted = submittedMap.get(String(u._id)) || 0;
        const missed = Math.max(0, lastWeeks.length - submitted);
        return { employeeId: String(u._id), name: u.fullName, missed };
      })
      .filter(r => r.missed >= 3)
      .sort((a, b) => b.missed - a.missed)
      .slice(0, 10);

    const goodAgg = await WeeklyTracker.aggregate([
      { $match: { year, employeeId: { $in: userIds }, status: { $in: ['submitted', 'reviewed'] } } },
      { $group: { _id: '$employeeId', submitted: { $sum: 1 }, good: { $sum: { $cond: ['$isGoodWeek', 1, 0] } } } },
    ]);
    const goodMap = new Map(goodAgg.map((r: any) => [String(r._id), r]));
    const goodWeekRate = users.map(u => {
      const g = goodMap.get(String(u._id)) || { submitted: 0, good: 0 };
      const rate = g.submitted > 0 ? Math.round((g.good / g.submitted) * 100) : 0;
      return { employeeId: String(u._id), name: u.fullName, goodWeeks: g.good || 0, submittedWeeks: g.submitted || 0, rate };
    }).sort((a, b) => b.rate - a.rate).slice(0, 10);

    return NextResponse.json({
      ok: true,
      summary: {
        totalEmployees,
        submittedWeek,
        missingWeek,
        goodWeeks,
        pendingReviews,
        complianceWeek,
        complianceLast4,
      },
      metrics,
      trend,
      roleWise,
      teamWise,
      topSubmitters,
      repeatMissing,
      goodWeekRate,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
