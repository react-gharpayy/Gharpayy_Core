import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Quest from '@/models/Quest';
import { ALL_QUESTS } from '@/lib/growth/quest-definitions';

const ALLOWED_ROLES = new Set(['admin', 'manager', 'hr']);

// Seed DB with quest definitions if none exist
async function seedIfEmpty() {
  const allQuests = await Quest.find({}).sort({ createdAt: 1 });
  
  // 1. Cleanup duplicates if any exist
  const seen = new Set();
  const toDelete = [];
  for (const q of allQuests) {
    if (seen.has(q.questId)) {
      toDelete.push(q._id);
    } else {
      seen.add(q.questId);
    }
  }
  if (toDelete.length > 0) {
    await Quest.deleteMany({ _id: { $in: toDelete } });
  }

  // 2. Insert missing static quests
  for (const q of ALL_QUESTS) {
    const exists = await Quest.findOne({ questId: q.id });
    if (!exists) {
      await Quest.create({ ...q, questId: q.id, isCustom: false, active: true });
    }
  }
}

// GET /api/growth/admin/quests
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || !ALLOWED_ROLES.has(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    await seedIfEmpty();

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind'); // 'daily' | 'weekly' | 'seasonal'
    const filter: Record<string, any> = {};
    if (kind) filter.kind = kind;

    const quests = await Quest.find(filter).sort({ kind: 1, createdAt: -1 }).lean();
    return NextResponse.json({ ok: true, quests });
  } catch (e) {
    console.error('/api/growth/admin/quests GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/growth/admin/quests - create new quest
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || !ALLOWED_ROLES.has(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const {
      title, description, kind, target, metric,
      xpAward, coinAward, active
    } = body;

    if (!title || !description || !kind || !target || !metric || xpAward === undefined || coinAward === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const questId = `q-custom-${Date.now()}`;
    const quest = await Quest.create({
      questId,
      title,
      description,
      kind,
      target: Number(target),
      metric,
      xpAward: Number(xpAward),
      coinAward: Number(coinAward),
      active: active !== false,
      isCustom: true
    });

    return NextResponse.json({ ok: true, quest });
  } catch (e) {
    console.error('/api/growth/admin/quests POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
