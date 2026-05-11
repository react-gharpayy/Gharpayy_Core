/**
 * PATCH  /api/departments/[id]  - Rename / update a department
 * DELETE /api/departments/[id]  - Archive a department (blocked if members exist)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Department from '@/models/Department';
import User from '@/models/User';
import { requirePermission } from '@/lib/permission-middleware';
import mongoose from 'mongoose';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requirePermission('MANAGE_SETTINGS');
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid department ID' }, { status: 400 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    for (const key of ['name', 'description', 'color']) {
      if (key in body) updates[key] = body[key];
    }

    if (updates.name) {
      const trimmed = String(updates.name).trim();
      if (!trimmed) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });

      await connectDB();
      const dup = await Department.findOne({
        _id: { $ne: id },
        name: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        isActive: true,
      });
      if (dup) return NextResponse.json({ error: `Department "${trimmed}" already exists` }, { status: 409 });
      updates.name = trimmed;
    } else {
      await connectDB();
    }

    const dept = await Department.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

    return NextResponse.json({ ok: true, department: dept });
  } catch (e: unknown) {
    console.error('[departments PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requirePermission('MANAGE_SETTINGS');
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid department ID' }, { status: 400 });
    }

    await connectDB();

    const dept = await Department.findById(id).lean() as any;
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

    const memberCount = await User.countDocuments({ department: dept.name, isApproved: true });
    if (memberCount > 0) {
      return NextResponse.json(
        { error: `Cannot archive "${dept.name}" — ${memberCount} employee${memberCount !== 1 ? 's are' : ' is'} still assigned to it` },
        { status: 409 }
      );
    }

    await Department.findByIdAndUpdate(id, { $set: { isActive: false } });
    return NextResponse.json({ ok: true, message: `"${dept.name}" archived` });
  } catch (e: unknown) {
    console.error('[departments DELETE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
