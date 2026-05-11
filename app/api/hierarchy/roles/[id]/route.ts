/**
 * PATCH  /api/hierarchy/roles/[id]  - Update a hierarchy role (admin only)
 * DELETE /api/hierarchy/roles/[id]  - Soft-delete a hierarchy role (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HierarchyRole from '@/models/HierarchyRole';
import { requirePermission } from '@/lib/permission-middleware';
import mongoose from 'mongoose';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requirePermission('MANAGE_ROLES');
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const body = await req.json();
    const allowed = ['name', 'description', 'color', 'level', 'systemRole', 'canManageTeam', 'canBeReportedTo', 'isActive'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    await connectDB();
    const role = await HierarchyRole.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    return NextResponse.json({ ok: true, role });
  } catch (e: unknown) {
    console.error('[hierarchy/roles PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requirePermission('MANAGE_ROLES');
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    await connectDB();
    // Soft delete — set isActive: false
    const role = await HierarchyRole.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    return NextResponse.json({ ok: true, message: 'Role deactivated' });
  } catch (e: unknown) {
    console.error('[hierarchy/roles DELETE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
