import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Tracker from '@/models/Tracker';
import mongoose from 'mongoose';

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const trackerId = normalizeText(body.trackerId);
    if (!trackerId || !mongoose.Types.ObjectId.isValid(trackerId)) {
      return NextResponse.json({ error: 'Invalid trackerId' }, { status: 400 });
    }

    await connectDB();
    const tracker = await Tracker.findById(trackerId);
    if (!tracker) {
      return NextResponse.json({ error: 'Tracker record not found' }, { status: 404 });
    }

    tracker.status = 'reviewed';
    tracker.isSubmitted = true;
    tracker.submissionStatus = 'submitted';
    tracker.adminNotes = normalizeText(body.adminNotes);
    tracker.adminImpact = normalizeText(body.adminImpact);
    tracker.adminIssues = normalizeText(body.adminIssues);
    tracker.isGoodWeek = !!body.isGoodWeek;
    tracker.reviewedAt = new Date();
    await tracker.save();

    return NextResponse.json({ ok: true, tracker });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
