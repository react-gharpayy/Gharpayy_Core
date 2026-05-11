/**
 * POST /api/hierarchy/assign
 *
 * Assigns hierarchy role, reporting manager, team, and job title to an employee.
 * Admin only.
 *
 * ARCHITECTURE:
 *   hierarchyRoleId → authority/permission tier (Manager, Team Lead, Employee)
 *   managerId       → reporting structure
 *   teamId          → operational team grouping (for Arena, KPIs, dashboards)
 *   jobTitle        → display designation (separate from hierarchy role)
 *
 * Body:
 *   employeeId      string  (required)
 *   hierarchyRoleId string  (optional)
 *   managerId       string  (optional)
 *   teamId          string  (optional)
 *   jobTitle        string  (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import HierarchyRole from '@/models/HierarchyRole';
import { requirePermission } from '@/lib/permission-middleware';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('ASSIGN_MANAGER');
    if (error) return error;

    const body = await req.json();
    const { employeeId, hierarchyRoleId, managerId, teamId, jobTitle } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    await connectDB();

    const updates: Record<string, unknown> = {};

    // ── Hierarchy role (authority tier) ──────────────────────────────────────
    if (hierarchyRoleId !== undefined) {
      if (!hierarchyRoleId) {
        updates.hierarchyRoleId = null;
        updates.systemRole = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(hierarchyRoleId)) {
          return NextResponse.json({ error: 'Invalid hierarchyRoleId' }, { status: 400 });
        }
        const hierarchyRole = await HierarchyRole.findById(hierarchyRoleId).lean() as any;
        if (!hierarchyRole) {
          return NextResponse.json({ error: 'Hierarchy role not found' }, { status: 404 });
        }
        updates.hierarchyRoleId = hierarchyRoleId;
        updates.systemRole = hierarchyRole.systemRole;

        // Keep legacy `role` field in sync
        const legacyRoleMap: Record<string, string> = {
          admin:     'admin',
          manager:   'manager',
          team_lead: 'manager',
          hr:        'employee',
          employee:  'employee',
        };
        const legacyRole = legacyRoleMap[hierarchyRole.systemRole];
        if (legacyRole) updates.role = legacyRole;
      }
    }

    // ── Reporting manager ─────────────────────────────────────────────────────
    if (managerId !== undefined) {
      if (!managerId) {
        updates.managerId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
          return NextResponse.json({ error: 'Invalid managerId' }, { status: 400 });
        }
        if (managerId === employeeId) {
          return NextResponse.json({ error: 'An employee cannot report to themselves' }, { status: 400 });
        }
        updates.managerId = managerId;
      }
    }

    // ── Operational team (for Arena, KPIs, dashboards) ────────────────────────
    if (teamId !== undefined) {
      updates.teamId = teamId || null;
    }

    // ── Job title (display only, separate from hierarchy role) ────────────────
    if (jobTitle !== undefined) {
      updates.jobTitle = typeof jobTitle === 'string' ? jobTitle.trim() : '';
    }

    const updated = await User.findByIdAndUpdate(
      employeeId,
      { $set: updates },
      { new: true, select: '-password' }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: unknown) {
    console.error('[hierarchy/assign POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import HierarchyRole from '@/models/HierarchyRole';
import { requirePermission } from '@/lib/permission-middleware';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('ASSIGN_MANAGER');
    if (error) return error;

    const body = await req.json();
    const { employeeId, hierarchyRoleId, managerId, teamId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    await connectDB();

    const updates: Record<string, unknown> = {};

    // Assign hierarchy role
    if (hierarchyRoleId !== undefined) {
      if (hierarchyRoleId === null || hierarchyRoleId === '') {
        updates.hierarchyRoleId = null;
        updates.systemRole = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(hierarchyRoleId)) {
          return NextResponse.json({ error: 'Invalid hierarchyRoleId' }, { status: 400 });
        }
        const hierarchyRole = await HierarchyRole.findById(hierarchyRoleId).lean() as any;
        if (!hierarchyRole) {
          return NextResponse.json({ error: 'Hierarchy role not found' }, { status: 404 });
        }
        updates.hierarchyRoleId = hierarchyRoleId;
        updates.systemRole = hierarchyRole.systemRole;

        // Keep legacy `role` field in sync for backward compatibility
        const legacyRoleMap: Record<string, string> = {
          admin:     'admin',
          manager:   'manager',
          team_lead: 'manager', // team_lead maps to manager in legacy schema
          hr:        'employee', // hr maps to employee in legacy schema (no hr enum value)
          employee:  'employee',
        };
        const legacyRole = legacyRoleMap[hierarchyRole.systemRole];
        if (legacyRole) updates.role = legacyRole;
      }
    }

    // Assign reporting manager
    if (managerId !== undefined) {
      if (managerId === null || managerId === '') {
        updates.managerId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
          return NextResponse.json({ error: 'Invalid managerId' }, { status: 400 });
        }
        // Prevent self-reporting
        if (managerId === employeeId) {
          return NextResponse.json({ error: 'An employee cannot report to themselves' }, { status: 400 });
        }
        updates.managerId = managerId;
      }
    }

    // Assign team
    if (teamId !== undefined) {
      updates.teamId = teamId === null || teamId === '' ? null : teamId;
    }

    const updated = await User.findByIdAndUpdate(
      employeeId,
      { $set: updates },
      { new: true, select: '-password' }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: unknown) {
    console.error('[hierarchy/assign POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
