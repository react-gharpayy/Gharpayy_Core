import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Holiday from '@/models/Holiday';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const holidays = await Holiday.find({}).sort({ date: 1 }).lean();
    return NextResponse.json({ ok: true, holidays });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { name, date, type, description } = await req.json();
    if (!name || !date) return NextResponse.json({ error: 'name and date required' }, { status: 400 });
    await connectDB();
    const exists = await Holiday.findOne({ date });
    if (exists) return NextResponse.json({ error: 'Holiday already exists for this date' }, { status: 409 });
    const holiday = await Holiday.create({ name, date, type: type || 'public', description: description || '' });
    return NextResponse.json({ ok: true, holiday });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
