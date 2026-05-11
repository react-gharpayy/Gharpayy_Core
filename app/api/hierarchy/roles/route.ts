/**
 * GET  /api/hierarchy/roles  - List all hierarchy role definitions
 * POST /api/hierarchy/roles  - Create a new hierarchy role (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HierarchyRole from '@/models/HierarchyRole';
import { requirePermission } from '@/lib/permission-middleware';

export async function GET() {
  try {
    const { user, error } = await requirePermission('VIEW_ADMIN_PANEL');
    if (error) return error;

    await connectDB();
    const roles = await HierarchyRole.find({ isActive: true }).sort({ level: 1, name: 1 }).lean();
    return NextResponse.json({ roles });
  } catch (e: unknown) {
    console.error('[hierarchy/roles GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requirePermission('MANAGE_ROLES');
    if (error) return error;

    const body = await req.json();
    const { name, slug, systemRole, level, description, color, canManageTeam, canBeReportedTo } = body;

    if (!name || !slug || !systemRole) {
      return NextResponse.json({ error: 'name, slug, and systemRole are required' }, { status: 400 });
    }

    const validSystemRoles = ['admin', 'manager', 'team_lead', 'hr', 'employee'];
    if (!validSystemRoles.includes(systemRole)) {
      return NextResponse.json(
        { error: `systemRole must be one of: ${validSystemRoles.join(', ')}` },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await HierarchyRole.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: 'A role with this slug already exists' }, { status: 409 });
    }

    const role = await HierarchyRole.create({
      name,
      slug,
      systemRole,
      level: level ?? 4,
      description,
      color: color ?? '#6b7280',
      canManageTeam: canManageTeam ?? false,
      canBeReportedTo: canBeReportedTo ?? false,
    });

    return NextResponse.json({ ok: true, role }, { status: 201 });
  } catch (e: unknown) {
    console.error('[hierarchy/roles POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
