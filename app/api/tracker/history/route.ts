import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Tracker from '@/models/Tracker';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import mongoose from 'mongoose';
import { getISTDateStr } from '@/lib/attendance-utils';

function getDefaultDailyCheckins() {
  return [
    { key: 'G1MYT', label: 'G1MYT', range: '10:30 AM - 12:00 PM', status: 'idle', targetCount: 0, progressNote: '', startedAt: '', completedAt: '' },
    { key: 'G2MYT', label: 'G2MYT', range: '12:00 PM - 2:15 PM', status: 'idle', targetCount: 0, progressNote: '', startedAt: '', completedAt: '' },
    { key: 'G3MYT', label: 'G3MYT', range: '2:30 PM - 4:00 PM', status: 'idle', targetCount: 0, progressNote: '', startedAt: '', completedAt: '' },
    { key: 'G4MYT', label: 'G4MYT', range: '4:00 PM - 5:35 PM', status: 'idle', targetCount: 0, progressNote: '', startedAt: '', completedAt: '' },
  ];
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get('employeeId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    let employeeId = auth.id;
    if ((auth.role === 'admin' || auth.role === 'manager' || auth.role === 'sub_admin') && employeeIdParam) {
      employeeId = employeeIdParam;
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    await connectDB();
    if (auth.role === 'manager' && employeeId !== auth.id) {
      const emp = await User.findById(employeeId).select('managerId').lean() as any;
      if (!emp || emp.managerId?.toString() !== auth.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const match: any = { employeeId: new mongoose.Types.ObjectId(employeeId) };
    if (start && end) match.date = { $gte: start, $lte: end };

    // If employee has attended today but no tracker exists, create it so admin sees daily records
    const today = getISTDateStr();
    const shouldEnsureToday =
      (!start && !end) ||
      (start && end && start <= today && end >= today);
    if (shouldEnsureToday) {
      const existingToday = await Tracker.findOne({ employeeId: match.employeeId, date: today });
      if (!existingToday) {
        const att = await Attendance.findOne({ employeeId: match.employeeId, date: today }).lean();
        if (att) {
          const empDoc = await User.findById(match.employeeId).select('role').lean() as any;
          await Tracker.create({
            employeeId: match.employeeId,
            date: today,
            role: empDoc?.role || 'employee',
            initial: '',
            onIt: '',
            impact: '',
            notes: '',
            issues: '',
            dailyCheckins: getDefaultDailyCheckins(),
            submittedAt: null,
            isSubmitted: false,
            isEdited: false,
            submissionStatus: 'pending',
            completionScore: 0,
          });
        }
      }
    }

    const total = await Tracker.countDocuments(match);
    const rows = await Tracker.find(match).sort({ date: -1 })
      .skip((page - 1) * limit).limit(limit).lean();

    return NextResponse.json({
      ok: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      records: rows,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
