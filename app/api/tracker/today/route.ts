import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Tracker from '@/models/Tracker';
import { getISTDateStr } from '@/lib/attendance-utils';
import mongoose from 'mongoose';

function normalizeText(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}
function normalizeNumber(v: unknown) {
  return Number(v || 0) || 0;
}
function normalizeCheckins(v: any) {
  if (!Array.isArray(v)) return null;
  return v.map((c) => ({
    key: String(c?.key || ''),
    label: String(c?.label || ''),
    range: String(c?.range || ''),
    status: ['idle', 'started', 'completed'].includes(c?.status) ? c.status : 'idle',
    targetCount: Number(c?.targetCount || 0),
    progressNote: typeof c?.progressNote === 'string' ? c.progressNote : '',
    startedAt: typeof c?.startedAt === 'string' ? c.startedAt : '',
    completedAt: typeof c?.completedAt === 'string' ? c.completedAt : '',
    mytAdded: Number(c?.mytAdded || 0),
    toursInPipeline: Number(c?.toursInPipeline || 0),
    toursDone: Number(c?.toursDone || 0),
    callsDone: Number(c?.callsDone || 0),
    connected: Number(c?.connected || 0),
    mytWhoWillPayToday: Number(c?.mytWhoWillPayToday || 0),
    tenantsPaid: Number(c?.tenantsPaid || 0),
    doubts: typeof c?.doubts === 'string' ? c.doubts : '',
    problems: typeof c?.problems === 'string' ? c.problems : '',
  }));
}

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'User record not found for tracker' }, { status: 400 });
    }
    await connectDB();
    const date = getISTDateStr();
    const tracker = await Tracker.findOne({ employeeId: auth.id, date }).lean();
    return NextResponse.json({ ok: true, date, tracker });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const hasTextFields = ['initial','onIt','impact','notes','issues'].some((k) => k in body);
    const initial = normalizeText(body.initial);
    const onIt = normalizeText(body.onIt);
    const impact = normalizeText(body.impact);
    const notes = normalizeText(body.notes);
    const issues = normalizeText(body.issues);
    const doubts = normalizeText(body.doubts);
    const manualLeadsToday = normalizeNumber(body.manualLeadsToday);
    const manualToursToday = normalizeNumber(body.manualToursToday);
    const drafts30 = normalizeNumber(body.drafts30);
    const mytAdded = normalizeNumber(body.mytAdded);
    const toursPipeline = normalizeNumber(body.toursPipeline);
    const toursDone = normalizeNumber(body.toursDone);
    const callsDone = normalizeNumber(body.callsDone);
    const connected = normalizeNumber(body.connected);
    const submit = !!body.submit;
    const checkins = normalizeCheckins(body.checkins);
    const missing = [initial, onIt, impact, notes, issues].some(v => !v);
    if (submit && missing) {
      return NextResponse.json({ error: 'Submit requires all fields' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'User record not found for tracker' }, { status: 400 });
    }
    await connectDB();
    const date = getISTDateStr();
    const existing = await Tracker.findOne({ employeeId: auth.id, date });

    const fieldsFilled = [initial, onIt, impact, notes, issues].filter(Boolean).length;
    const completionScore = Math.round((fieldsFilled / 5) * 100);

    if (!existing) {
      const created = await Tracker.create({
        employeeId: auth.id,
        date,
        role: auth.role,
        initial,
        onIt,
        impact,
        notes,
        issues,
        doubts,
        drafts30,
        mytAdded,
        toursPipeline,
        toursDone,
        callsDone,
        connected,
        manualLeadsToday,
        manualToursToday,
        dailyCheckins: checkins || [],
        submittedAt: submit ? new Date() : null,
        isSubmitted: submit,
        isEdited: false,
        status: submit ? 'submitted' : 'draft',
        submissionStatus: submit ? 'submitted' : 'pending',
        completionScore,
      });
      return NextResponse.json({ ok: true, tracker: created });
    }

    const wasSubmitted = !!existing.isSubmitted;
    if (hasTextFields) {
      existing.initial = initial;
      existing.onIt = onIt;
      existing.impact = impact;
      existing.notes = notes;
      existing.issues = issues;
    }
    existing.doubts = doubts;
    existing.drafts30 = drafts30;
    existing.mytAdded = mytAdded;
    existing.toursPipeline = toursPipeline;
    existing.toursDone = toursDone;
    existing.callsDone = callsDone;
    existing.connected = connected;
    existing.manualLeadsToday = manualLeadsToday;
    existing.manualToursToday = manualToursToday;
    if (checkins) {
      existing.dailyCheckins = checkins;
    }
    if (submit) {
      existing.isSubmitted = true;
      existing.isEdited = wasSubmitted || existing.isEdited;
      existing.submissionStatus = existing.isEdited ? 'edited' : 'submitted';
      existing.status = 'submitted';
      existing.submittedAt = existing.submittedAt || new Date();
    } else {
      existing.isSubmitted = wasSubmitted;
      existing.status = wasSubmitted ? 'submitted' : 'draft';
      existing.submissionStatus = wasSubmitted ? (existing.isEdited ? 'edited' : 'submitted') : 'pending';
    }
    if (hasTextFields) {
      existing.completionScore = completionScore;
    }
    await existing.save();

    return NextResponse.json({ ok: true, tracker: existing });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
