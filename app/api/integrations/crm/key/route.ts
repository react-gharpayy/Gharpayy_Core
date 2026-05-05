import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import IntegrationKey from '@/models/IntegrationKey';

function maskKey(key: string) {
  if (!key) return '';
  if (key.length <= 8) return `${key.slice(0, 2)}••••${key.slice(-2)}`;
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const doc = await IntegrationKey.findOne({ orgId: String(user.id) }).lean();
    return NextResponse.json({
      ok: true,
      connected: !!doc?.key,
      maskedKey: doc?.key ? maskKey(doc.key) : null,
      updatedAt: doc?.updatedAt || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const key = String(body?.key || '').trim();
    if (!key || key.length < 8) {
      return NextResponse.json({ error: 'Invalid integration key' }, { status: 400 });
    }

    await connectDB();
    const doc = await IntegrationKey.findOneAndUpdate(
      { orgId: String(user.id) },
      { key },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return NextResponse.json({
      ok: true,
      connected: true,
      maskedKey: doc?.key ? maskKey(doc.key) : null,
      updatedAt: doc?.updatedAt || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
