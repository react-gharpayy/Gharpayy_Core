import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Tracker from '@/models/Tracker';
import User from '@/models/User';
import { getISTDateStr } from '@/lib/attendance-utils';
import { listDatesInRange } from '@/lib/leave-utils';
import { buildEmployeeFilter } from '@/lib/role-guards';
import mongoose from 'mongoose';

function dateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return getISTDateStr(d);
}

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = getISTDateStr();
    const weekStart = dateDaysAgo(6);
    const monthStart = `${today.slice(0, 7)}-01`;
    const last30Start = dateDaysAgo(29);

    const empFilter = buildEmployeeFilter(auth, { isApproved: { $ne: false } });
    if (empFilter === null) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    await connectDB();
    const users = await User.find(empFilter).select('_id fullName role teamName department').lean() as any[];
    const totalUsers = users.length;
    const userIds = users.map(u => u._id);

    const submittedToday = await Tracker.countDocuments({
      date: today,
      employeeId: { $in: userIds },
      isSubmitted: true,
    });
    const editedToday = await Tracker.countDocuments({
      date: today,
      employeeId: { $in: userIds },
      isEdited: true,
    });

    const weekDays = listDatesInRange(weekStart, today);
    const monthDays = listDatesInRange(monthStart, today);
    const expectedWeek = totalUsers * weekDays.length;
    const expectedMonth = totalUsers * monthDays.length;

    const submittedWeek = await Tracker.countDocuments({
      date: { $gte: weekStart, $lte: today },
      employeeId: { $in: userIds },
      isSubmitted: true,
    });
    const submittedMonth = await Tracker.countDocuments({
      date: { $gte: monthStart, $lte: today },
      employeeId: { $in: userIds },
      isSubmitted: true,
    });

    const dailyCompliance = totalUsers > 0 ? Math.round((submittedToday / totalUsers) * 100) : 0;
    const weeklyCompliance = expectedWeek > 0 ? Math.round((submittedWeek / expectedWeek) * 100) : 0;
    const monthlyCompliance = expectedMonth > 0 ? Math.round((submittedMonth / expectedMonth) * 100) : 0;

    const roleTotals: Record<string, number> = {};
    const teamTotals: Record<string, number> = {};
    users.forEach(u => {
      roleTotals[u.role] = (roleTotals[u.role] || 0) + 1;
      const team = u.teamName || 'Unassigned';
      teamTotals[team] = (teamTotals[team] || 0) + 1;
    });

    const roleSubmittedAgg = await Tracker.aggregate([
      { $match: { date: today, employeeId: { $in: userIds }, isSubmitted: true } },
      { $group: { _id: '$role', submitted: { $sum: 1 } } },
    ]);
    const roleWise = Object.entries(roleTotals).map(([role, total]) => {
      const found = roleSubmittedAgg.find((r: any) => r._id === role);
      const submitted = found?.submitted || 0;
      return {
        role,
        total,
        submitted,
        compliance: total > 0 ? Math.round((submitted / total) * 100) : 0,
      };
    });

    const todayTrackers = await Tracker.find({ date: today, employeeId: { $in: userIds }, isSubmitted: true }).lean();
    const teamSubmitted: Record<string, number> = {};
    const teamMap = new Map(users.map(u => [String(u._id), u.teamName || 'Unassigned']));
    todayTrackers.forEach((t: any) => {
      const team = teamMap.get(String(t.employeeId)) || 'Unassigned';
      teamSubmitted[team] = (teamSubmitted[team] || 0) + 1;
    });
    const teamWise = Object.entries(teamTotals).map(([team, total]) => {
      const submitted = teamSubmitted[team] || 0;
      return {
        team,
        total,
        submitted,
        compliance: total > 0 ? Math.round((submitted / total) * 100) : 0,
      };
    });

    const last30Agg = await Tracker.aggregate([
      { $match: { date: { $gte: last30Start, $lte: today }, employeeId: { $in: userIds }, isSubmitted: true } },
      { $group: { _id: '$employeeId', submitted: { $sum: 1 } } },
      { $sort: { submitted: -1 } },
      { $limit: 10 },
    ]);
    const topSubmitters = last30Agg.map((r: any) => {
      const u = users.find(x => String(x._id) === String(r._id));
      return { employeeId: String(r._id), name: u?.fullName || 'Unknown', submitted: r.submitted || 0 };
    });

    const perEmployeeAgg = await Tracker.aggregate([
      { $match: { date: { $gte: last30Start, $lte: today }, employeeId: { $in: userIds }, isSubmitted: true } },
      { $group: { _id: '$employeeId', submitted: { $sum: 1 } } },
    ]);
    const expected30 = listDatesInRange(last30Start, today).length;
    const missedMap = new Map(perEmployeeAgg.map((r: any) => [String(r._id), r.submitted]));
    const repeatMissed = users.map(u => {
      const submitted = missedMap.get(String(u._id)) || 0;
      const missed = Math.max(0, expected30 - submitted);
      return { employeeId: String(u._id), name: u.fullName, missed };
    }).sort((a, b) => b.missed - a.missed).slice(0, 10);

    const trendAgg = await Tracker.aggregate([
      { $match: { date: { $gte: weekStart, $lte: today }, employeeId: { $in: userIds }, isSubmitted: true } },
      { $group: { _id: '$date', submitted: { $sum: 1 } } },
    ]);
    const trendMap = new Map(trendAgg.map((r: any) => [r._id, r.submitted]));
    const trend = weekDays.map(d => {
      const submitted = trendMap.get(d) || 0;
      return {
        date: d,
        submitted,
        compliance: totalUsers > 0 ? Math.round((submitted / totalUsers) * 100) : 0,
      };
    });

    return NextResponse.json({
      ok: true,
      summary: {
        totalUsers,
        submittedToday,
        missingToday: Math.max(0, totalUsers - submittedToday),
        editedToday,
        dailyCompliance,
        weeklyCompliance,
        monthlyCompliance,
      },
      roleWise,
      teamWise,
      topSubmitters,
      repeatMissed,
      trend,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
