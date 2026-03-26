import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import OfficeZone from '@/models/OfficeZone';

export async function GET() {
  try {
    await connectDB();
    const zones = await OfficeZone.find().sort({ name: 1 });
    return NextResponse.json({ ok: true, zones });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
