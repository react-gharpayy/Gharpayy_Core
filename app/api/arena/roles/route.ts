import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { PlaybookRole } from '@/models/PlaybookRole';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const roles = await PlaybookRole.find({}).sort({ name: 1 });
    return NextResponse.json({ ok: true, roles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { slugify } from '@/lib/slugify';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    let { name, slug, color, description, isActive, _id } = body;

    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    await connectDB();

    // Auto-generate slug if it's a new role and slug is missing
    if (!_id && !slug) {
      let baseSlug = slugify(name);
      let finalSlug = baseSlug;
      let counter = 1;
      
      while (await PlaybookRole.findOne({ slug: finalSlug })) {
        counter++;
        finalSlug = `${baseSlug}_${counter}`;
      }
      slug = finalSlug;
    }

    const role = await PlaybookRole.findOneAndUpdate(
      { _id: _id || new mongoose.Types.ObjectId() },
      { $set: { name, slug, color, description, isActive } },
      { new: true, upsert: true }
    );

    return NextResponse.json({ ok: true, role });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    await connectDB();
    // TODO: Check if employees are assigned to this role before deleting
    await PlaybookRole.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
