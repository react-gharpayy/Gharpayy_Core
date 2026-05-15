/**
 * GET  /api/hierarchy/team  - Get the caller's team (direct reports)
 * 
 * Returns the list of employees who report to the authenticated user.
 * Managers/team leads see their direct reports.
 * Admins can pass ?managerId=xxx to view any manager's team.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import '@/models/HierarchyRole'; // required so Mongoose registers the schema for populate
import '@/models/Team';          // required so Mongoose registers the schema for populate
import { requirePermission } from '@/lib/permission-middleware';
import { isAdmin } from '@/lib/permissions';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requirePermission('VIEW_TEAM_EMPLOYEES');
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(req.url);
    // Admins can query any manager's team; others always see their own
    let targetManagerId: string = user.id;

    if (isAdmin(user)) {
      const qManagerId = searchParams.get('managerId');
      if (qManagerId) {
        if (!mongoose.Types.ObjectId.isValid(qManagerId)) {
          return NextResponse.json({ error: 'Invalid managerId' }, { status: 400 });
        }
        targetManagerId = qManagerId;
      }
    }

    const teamMembers = await User.find(
      { managerId: targetManagerId, isApproved: true },
      'fullName email role systemRole hierarchyRoleId teamId teamName department jobRole managerId createdAt'
    )
      .populate('hierarchyRoleId', 'name slug color level systemRole')
      .populate('teamId', 'name slug color')
      .lean();

    return NextResponse.json({ team: teamMembers, managerId: targetManagerId });
  } catch (e: unknown) {
    console.error('[hierarchy/team GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
