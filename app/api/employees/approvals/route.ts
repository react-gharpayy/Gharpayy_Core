import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';
import { SHIFT_TEMPLATES, ShiftType, WEEK_DAYS } from '@/lib/shift-templates';

// GET - List pending/approved employees
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'pending' or 'approved' or 'all'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { role: 'employee' };
    if (status === 'pending') query.isApproved = false;
    if (status === 'approved') query.isApproved = true;

    const employees = await User.find(query)
      .populate('officeZoneId', 'name')
      .select('-password -profilePhoto')
      .sort({ createdAt: -1 });

    return NextResponse.json({ ok: true, count: employees.length, employees });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Approve or reject employee
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { employeeId, action, schedule } = await req.json();
    if (!employeeId || !action) {
      return NextResponse.json({ error: 'employeeId and action required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (action === 'approve') {
      const shiftType = (schedule?.shiftType || '').toString() as ShiftType;
      const isCustom = shiftType === 'CUSTOM';
      const isKnown = shiftType === 'CUSTOM' || shiftType === 'FT_MAIN' || shiftType === 'FT_EARLY' || shiftType === 'INTERN_DAY';
      if (!isKnown) {
        return NextResponse.json({ error: 'shiftType is required' }, { status: 400 });
      }

      const isHHMM = (v: unknown) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
      let startTime = '';
      let endTime = '';
      let breaks: { name: string; start: string; end: string; durationMinutes: number }[] = [];
      let weekOffs: string[] = [];

      if (!isCustom) {
        const tmpl = SHIFT_TEMPLATES[shiftType as Exclude<ShiftType, 'CUSTOM'>];
        startTime = tmpl.workStart;
        endTime = tmpl.workEnd;
        breaks = tmpl.breaks;
        weekOffs = tmpl.weekOffs;
      } else {
        startTime = schedule?.startTime || '';
        endTime = schedule?.endTime || '';
        breaks = Array.isArray(schedule?.breaks) ? schedule.breaks : [];
        weekOffs = Array.isArray(schedule?.weekOffs) ? schedule.weekOffs : [];
      }

      if (Array.isArray(schedule?.weekOffs)) {
        weekOffs = schedule.weekOffs;
      }

      if (!isHHMM(startTime) || !isHHMM(endTime)) {
        return NextResponse.json({ error: 'Valid work start/end time required' }, { status: 400 });
      }
      for (const b of breaks) {
        if (!b || !isHHMM(b.start) || !isHHMM(b.end) || !Number.isFinite(Number(b.durationMinutes))) {
          return NextResponse.json({ error: 'Invalid break schedule' }, { status: 400 });
        }
      }
      if (weekOffs.length > 0 && weekOffs.some(d => !WEEK_DAYS.includes(d))) {
        return NextResponse.json({ error: 'Invalid week off day' }, { status: 400 });
      }

      const breakDuration = breaks.reduce((sum, b) => sum + Number(b.durationMinutes || 0), 0);
      employee.workSchedule = {
        shiftType,
        startTime,
        endTime,
        breakDuration,
        breaks,
        weekOffs,
        isCustomShift: isCustom,
        isLocked: true,
        setBy: 'admin',
      };
      employee.isApproved = true;
      await employee.save();
      return NextResponse.json({ ok: true, message: `Approved ${employee.fullName}` });
    } else {
      // reject = delete the user
      await User.findByIdAndDelete(employeeId);
      return NextResponse.json({ ok: true, message: `Rejected ${employee.fullName}` });
    }
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Edit employee details (admin only)
export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { employeeId, jobRole, officeZoneId } = await req.json();
    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });

    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Admin can only edit these fields
    if (jobRole) employee.jobRole = jobRole;
    if (officeZoneId) employee.officeZoneId = officeZoneId;

    await employee.save();
    return NextResponse.json({ ok: true, message: 'Employee updated', employee });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
