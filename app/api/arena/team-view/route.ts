/**
 * GET /api/arena/team-view
 *
 * Returns employees grouped by their teamName for the Arena admin view.
 * This replaces the old role-based grouping in the Arena admin UI.
 *
 * Each group contains:
 *   - teamName (the operational team)
 *   - members with their playbookRole, hierarchyRole, jobTitle, and today's Arena state
 *
 * Admins see all teams. Managers see only their team.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { canAccess } from '@/lib/permissions';
import User from '@/models/User';
import { ArenaDailyState } from '@/models/ArenaState';
import '@/models/HierarchyRole';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !canAccess(authUser, 'VIEW_TEAM_EMPLOYEES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const today = new Date().toISOString().split('T')[0];

    // Scope: managers see only their direct reports
    const userQuery: any = { isApproved: true };
    if (authUser.role === 'manager') {
      userQuery.managerId = authUser.id;
    }

    const users = await User.find(userQuery)
      .select('fullName email role playbookRole teamName department jobTitle hierarchyRoleId managerId')
      .populate({ path: 'hierarchyRoleId', select: 'name color level', strictPopulate: false })
      .lean() as any[];

    // Fetch today's Arena states for all these users in one query
    const userIds = users.map(u => u._id);
    const states = await ArenaDailyState.find({
      userId: { $in: userIds },
      date: today,
    }).select('userId shieldMode kpis sprints').lean() as any[];

    const stateMap: Record<string, any> = {};
    states.forEach(s => { stateMap[s.userId.toString()] = s; });

    // Group by teamName — employees without a team go into "Unassigned"
    const groups: Record<string, { teamName: string; members: any[] }> = {};

    for (const u of users) {
      const key = u.teamName || '__unassigned__';
      if (!groups[key]) {
        groups[key] = { teamName: u.teamName || 'Unassigned', members: [] };
      }
      const state = stateMap[u._id.toString()];
      groups[key].members.push({
        _id:           u._id.toString(),
        fullName:      u.fullName,
        email:         u.email,
        role:          u.role,
        playbookRole:  u.playbookRole || null,
        jobTitle:      u.jobTitle     || null,
        department:    u.department   || null,
        hierarchyRole: u.hierarchyRoleId
          ? { name: (u.hierarchyRoleId as any).name, color: (u.hierarchyRoleId as any).color }
          : null,
        arenaState: state
          ? { shieldMode: state.shieldMode, hasActivity: !!(state.kpis && Object.keys(state.kpis).length > 0) }
          : null,
      });
    }

    // Sort: named teams first, Unassigned last
    const sorted = Object.values(groups).sort((a, b) => {
      if (a.teamName === 'Unassigned') return 1;
      if (b.teamName === 'Unassigned') return -1;
      return a.teamName.localeCompare(b.teamName);
    });

    return NextResponse.json({ ok: true, groups: sorted, date: today });
  } catch (e: unknown) {
    console.error('[arena/team-view GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
