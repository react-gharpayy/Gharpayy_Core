/**
 * GET  /api/departments  - List all active departments with member counts
 * POST /api/departments  - Create a department (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Department from '@/models/Department';
import User from '@/models/User';
import { requirePermission, requireAnyPermission } from '@/lib/permission-middleware';
import { slugify } from '@/lib/slugify';

export async function GET() {
  try {
    const { error } = await requireAnyPermission(['VIEW_TEAM_EMPLOYEES', 'VIEW_ALL_EMPLOYEES']);
    if (error) return error;

    await connectDB();

    const departments = await Department.find({ isActive: true })
      .select('name slug description color isActive createdAt')
      .sort({ name: 1 })
      .lean() as any[];

    // Attach member counts
    const deptNames = departments.map((d: any) => d.name);
    const counts = await User.aggregate([
      { $match: { department: { $in: deptNames }, isApproved: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    counts.forEach((c: any) => { countMap[c._id] = c.count; });

    const result = departments.map((d: any) => ({ ...d, memberCount: countMap[d.name] ?? 0 }));
    return NextResponse.json({ departments: result });
  } catch (e: unknown) {
    console.error('[departments GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('MANAGE_SETTINGS');
    if (error) return error;

    const body = await req.json();
    const { name, description, color } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const slug = slugify(trimmedName);

    await connectDB();

    // Case-insensitive duplicate check
    const existing = await Department.findOne({
      name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      isActive: true,
    });
    if (existing) {
      return NextResponse.json({ error: `Department "${trimmedName}" already exists` }, { status: 409 });
    }

    let finalSlug = slug;
    let counter = 1;
    while (await Department.findOne({ slug: finalSlug })) {
      finalSlug = `${slug}_${counter++}`;
    }

    const dept = await Department.create({
      name: trimmedName,
      slug: finalSlug,
      description: description || '',
      color: color || '#6b7280',
    });

    return NextResponse.json({ ok: true, department: dept }, { status: 201 });
  } catch (e: unknown) {
    console.error('[departments POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
