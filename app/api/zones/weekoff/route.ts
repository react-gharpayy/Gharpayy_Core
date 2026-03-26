import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import OfficeZone from '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';

const VALID_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// GET - return current week off day
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zone = await OfficeZone.findOne({}).lean() as any;
    return NextResponse.json({ weekOffDay: zone?.weekOffDay || 'Tuesday' });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - admin sets week off day
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 401 });
    }

    const { weekOffDay } = await req.json();
    if (!VALID_DAYS.includes(weekOffDay)) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 });
    }

    await connectDB();
    await OfficeZone.updateMany({}, { weekOffDay });

    return NextResponse.json({ ok: true, weekOffDay });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
