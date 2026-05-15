/**
 * POST /api/hierarchy/seed
 *
 * Seeds the default hierarchy role definitions.
 * Admin only. Safe to run multiple times (upserts by slug).
 *
 * This creates the initial set of configurable roles.
 * Client-specific roles can be added later via POST /api/hierarchy/roles.
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HierarchyRole from '@/models/HierarchyRole';
import { requirePermission } from '@/lib/permission-middleware';

const DEFAULT_ROLES = [
  {
    name: 'Admin',
    slug: 'admin',
    systemRole: 'admin',
    level: 0,
    description: 'Full system access',
    color: '#ef4444',
    canManageTeam: true,
    canBeReportedTo: true,
  },
  {
    name: 'Manager',
    slug: 'manager',
    systemRole: 'manager',
    level: 1,
    description: 'Manages a team, approves leaves, hosts 1:1s',
    color: '#c084fc',
    canManageTeam: true,
    canBeReportedTo: true,
  },
  {
    name: 'Team Lead',
    slug: 'team_lead',
    systemRole: 'team_lead',
    level: 2,
    description: 'Leads a sub-team, reviews team members',
    color: '#60a5fa',
    canManageTeam: true,
    canBeReportedTo: true,
  },
  {
    name: 'HR',
    slug: 'hr',
    systemRole: 'hr',
    level: 3,
    description: 'HR access: employee management, leave approvals, org reports',
    color: '#34d399',
    canManageTeam: false,
    canBeReportedTo: false,
  },
  {
    name: 'Employee',
    slug: 'employee',
    systemRole: 'employee',
    level: 4,
    description: 'Standard employee access',
    color: '#22c55e',
    canManageTeam: false,
    canBeReportedTo: false,
  },
];

export async function POST() {
  try {
    const { error } = await requirePermission('MANAGE_ROLES');
    if (error) return error;

    await connectDB();

    const results = await Promise.all(
      DEFAULT_ROLES.map(role =>
        HierarchyRole.findOneAndUpdate(
          { slug: role.slug },
          { $setOnInsert: role },
          { upsert: true, new: true }
        )
      )
    );

    return NextResponse.json({
      ok: true,
      message: `Seeded ${results.length} hierarchy roles`,
      roles: results,
    });
  } catch (e: unknown) {
    console.error('[hierarchy/seed POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
