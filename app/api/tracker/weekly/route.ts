import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z, ZodError } from 'zod';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import WeeklyTracker from '@/models/WeeklyTracker';
import WeeklyTrackerConfig from '@/models/WeeklyTrackerConfig';
import User from '@/models/User';
import { buildEmployeeFilter } from '@/lib/role-guards';
import { getCurrentWeekInfo, getWeekRange } from '@/lib/week-utils';

const goalSchema = z.object({
  target: z.number().min(0).default(0),
  actual: z.number().min(0).default(0),
  notes: z.string().max(500).default(''),
});

const glToursSchema = z.object({
  target: z.number().min(0).default(0),
  actual: z.number().min(0).default(0),
  locations: z.string().max(500).default(''),
});

const weeklySchema = z.object({
  year: z.number().int(),
  weekNumber: z.number().int().min(1).max(44),
  drafts30: z.number().min(0).default(0),
  mytAdded: z.number().min(0).default(0),
  toursPipeline: z.number().min(0).default(0),
  toursDone: z.number().min(0).default(0),
  callsDone: z.number().min(0).default(0),
  connected: z.number().min(0).default(0),
  doubts: z.string().max(2000).default(''),
  manualLeadsToday: z.number().min(0).default(0),
  manualToursToday: z.number().min(0).default(0),
  g1: goalSchema.optional(),
  g2: goalSchema.optional(),
  g3: goalSchema.optional(),
  g4: goalSchema.optional(),
  glTours: glToursSchema.optional(),
  initial: z.string().max(2000).optional(),
  onIt: z.string().max(2000).optional(),
  impact: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  issues: z.string().max(2000).optional(),
  status: z.enum(['draft', 'submitted']).default('draft'),
});

function parseNumber(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const nowInfo = getCurrentWeekInfo();
    const year = parseNumber(searchParams.get('year'), nowInfo.year);
    const weekNumber = parseNumber(searchParams.get('week'), nowInfo.weekNumber);
    const hasWeek = searchParams.has('week');
    const employeeId = searchParams.get('employeeId') || '';
    const role = searchParams.get('role') || '';
    const department = searchParams.get('department') || '';
    const team = searchParams.get('team') || '';
    const status = searchParams.get('status') || '';

    await connectDB();

    if (auth.role === 'employee' || employeeId) {
      const targetId = employeeId || auth.id;
      if (auth.role === 'employee' && targetId !== auth.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
      }
      if (hasWeek) {
        const tracker = await WeeklyTracker.findOne({ employeeId: targetId, year, weekNumber }).lean();
        return NextResponse.json({
          ok: true,
          week: getWeekRange(year, weekNumber),
          records: tracker ? [tracker] : [],
        });
      }
      const records = await WeeklyTracker.find({ employeeId: targetId, year }).sort({ weekNumber: -1 }).lean();
      return NextResponse.json({ ok: true, records });
    }

    const baseFilter: any = { isApproved: { $ne: false } };
    if (role) baseFilter.role = role;
    if (department) baseFilter.department = department;
    if (team) baseFilter.teamName = team;
    if (employeeId) baseFilter._id = employeeId;

    const empFilter = buildEmployeeFilter(auth, baseFilter);
    if (empFilter === null) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const employees = await User.find(empFilter)
      .select('fullName email role teamName department jobRole managerId')
      .lean() as any[];
    const employeeIds = employees.map(e => e._id);

    const trackers = await WeeklyTracker.find({ year, weekNumber, employeeId: { $in: employeeIds } }).lean();
    const trackerMap = new Map(trackers.map(t => [String(t.employeeId), t]));

    let rows = employees.map(e => {
      const t = trackerMap.get(String(e._id)) as any;
      const rowStatus = t?.status || 'missing';
      return {
        employeeId: String(e._id),
        employeeName: e.fullName,
        email: e.email,
        role: e.role,
        teamName: e.teamName || '',
        department: e.department || '',
        jobRole: e.jobRole || '',
        status: rowStatus,
        tracker: t || null,
      };
    });

    if (status) rows = rows.filter(r => r.status === status);

    const totalEmployees = employees.length;
    const submittedWeek = trackers.filter(t => t.status === 'submitted' || t.status === 'reviewed').length;
    const goodWeeks = trackers.filter(t => t.isGoodWeek).length;
    const pendingReviews = trackers.filter(t => t.status === 'submitted').length;
    const missingWeek = Math.max(0, totalEmployees - submittedWeek);

    const orgObjectId = mongoose.Types.ObjectId.isValid(auth.id) ? new mongoose.Types.ObjectId(auth.id) : null;
    const config = orgObjectId ? await WeeklyTrackerConfig.findOne({ orgId: orgObjectId }).lean() : null;

    return NextResponse.json({
      ok: true,
      week: getWeekRange(year, weekNumber),
      summary: { totalEmployees, submittedWeek, missingWeek, goodWeeks, pendingReviews },
      rows,
      fields: [
        { key: 'drafts30', label: '30 DRAFTS?' },
        { key: 'mytAdded', label: 'MYT ADDED' },
        { key: 'toursPipeline', label: 'TOURS IN PIPELINE' },
        { key: 'toursDone', label: 'TOURS DONE' },
        { key: 'callsDone', label: 'CALLS DONE' },
        { key: 'connected', label: 'CONNECTED' },
        { key: 'doubts', label: 'DOUBTS' },
      ],
      labels: {
        g1: config?.g1Label || 'G1',
        g2: config?.g2Label || 'G2',
        g3: config?.g3Label || 'G3',
        g4: config?.g4Label || 'G4',
        glTours: config?.glToursLabel || 'GL Tours',
      },
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let parsed;
    try {
      parsed = weeklySchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
      throw e;
    }

    const nowInfo = getCurrentWeekInfo();
    if (parsed.year > nowInfo.year || (parsed.year === nowInfo.year && parsed.weekNumber > nowInfo.weekNumber)) {
      return NextResponse.json({ error: 'Cannot submit future weeks' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(auth.id).select('fullName role teamName department').lean() as any;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const range = getWeekRange(parsed.year, parsed.weekNumber);
    const existing = await WeeklyTracker.findOne({ employeeId: auth.id, year: parsed.year, weekNumber: parsed.weekNumber });
    const isCurrentWeek = parsed.year === nowInfo.year && parsed.weekNumber === nowInfo.weekNumber;

    if (existing?.status === 'reviewed') {
      return NextResponse.json({ error: 'This week is already reviewed' }, { status: 400 });
    }
    if (existing?.status === 'submitted' && !isCurrentWeek) {
      return NextResponse.json({ error: 'Submitted weeks are locked' }, { status: 400 });
    }

    let nextStatus: 'draft' | 'submitted' = parsed.status;
    if (existing?.status === 'submitted') nextStatus = 'submitted';

    const orgObjectId = user?.managerId && mongoose.Types.ObjectId.isValid(String(user.managerId))
      ? new mongoose.Types.ObjectId(String(user.managerId))
      : new mongoose.Types.ObjectId(auth.id);
    const payload = {
      employeeId: auth.id,
      orgId: orgObjectId,
      employeeName: user.fullName || auth.fullName || auth.email,
      role: user.role || auth.role,
      teamName: user.teamName || '',
      department: user.department || '',
      year: parsed.year,
      weekNumber: parsed.weekNumber,
      weekStartDate: range.startDate,
      weekEndDate: range.endDate,
      drafts30: parsed.drafts30,
      mytAdded: parsed.mytAdded,
      toursPipeline: parsed.toursPipeline,
      toursDone: parsed.toursDone,
      callsDone: parsed.callsDone,
      connected: parsed.connected,
      doubts: parsed.doubts,
      manualLeadsToday: parsed.manualLeadsToday,
      manualToursToday: parsed.manualToursToday,
      g1: parsed.g1 ?? existing?.g1 ?? { target: 0, actual: 0, notes: '' },
      g2: parsed.g2 ?? existing?.g2 ?? { target: 0, actual: 0, notes: '' },
      g3: parsed.g3 ?? existing?.g3 ?? { target: 0, actual: 0, notes: '' },
      g4: parsed.g4 ?? existing?.g4 ?? { target: 0, actual: 0, notes: '' },
      glTours: parsed.glTours ?? existing?.glTours ?? { target: 0, actual: 0, locations: '' },
      initial: parsed.initial ?? existing?.initial ?? '',
      onIt: parsed.onIt ?? existing?.onIt ?? '',
      impact: parsed.impact ?? existing?.impact ?? '',
      notes: parsed.notes ?? existing?.notes ?? '',
      issues: parsed.issues ?? existing?.issues ?? '',
      status: nextStatus,
    };

    let tracker;
    if (existing) {
      Object.assign(existing, payload);
      if (nextStatus === 'submitted' && !existing.submittedAt) existing.submittedAt = new Date();
      await existing.save();
      tracker = existing;
    } else {
      tracker = await WeeklyTracker.create({
        ...payload,
        submittedAt: nextStatus === 'submitted' ? new Date() : null,
      });
    }

    return NextResponse.json({ ok: true, tracker });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
