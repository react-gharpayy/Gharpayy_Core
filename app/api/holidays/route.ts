import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Holiday from '@/models/Holiday';

// GET /api/holidays?year=2026&orgId=xxx
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const orgId = searchParams.get('orgId');
    const type = searchParams.get('type');

    const filter: Record<string, unknown> = { year, isActive: true };
    if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
      filter.orgId = new mongoose.Types.ObjectId(orgId);
    }
    if (type) filter.type = type;

    const holidays = await Holiday.find(filter).sort({ date: 1 }).lean();
    return NextResponse.json({ ok: true, holidays });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}

// POST /api/holidays — admin only
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'admin' && auth.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();
    const { name, date, year, type, description, orgId } = body;

    if (!name || !date || !year) {
      return NextResponse.json({ error: 'name, date, year are required' }, { status: 400 });
    }

    const orgObjectId = orgId && mongoose.Types.ObjectId.isValid(orgId)
      ? new mongoose.Types.ObjectId(orgId)
      : (mongoose.Types.ObjectId.isValid(auth.id) ? new mongoose.Types.ObjectId(auth.id) : null);

    if (!orgObjectId) {
      return NextResponse.json({ error: 'Invalid orgId' }, { status: 400 });
    }

    const holiday = await Holiday.create({
      orgId: orgObjectId,
      name,
      date,
      year,
      type: type || 'national',
      description,
      createdBy: mongoose.Types.ObjectId.isValid(auth.id) ? new mongoose.Types.ObjectId(auth.id) : undefined,
      isActive: true,
    });

    return NextResponse.json({ ok: true, holiday }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create holiday';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/holidays?id=xxx — admin only (soft delete)
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role !== 'admin' && auth.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await Holiday.findByIdAndUpdate(id, { isActive: false });
    return NextResponse.json({ ok: true, message: 'Holiday removed' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
  }
}
