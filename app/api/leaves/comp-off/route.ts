import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import CompOffCredit from '@/models/CompOffCredit';
import LeaveBalance from '@/models/LeaveBalance';
import Holiday from '@/models/Holiday';
import User from '@/models/User';
import { getPolicyForUser, weekdayName } from '@/lib/leave-utils';

/**
 * POST /api/leaves/comp-off
 * Body: { employeeId, date, reason? }
 * 
 * Credits 1 comp-off leave day to an employee who worked on a holiday or Sunday.
 * Admin/sub_admin can manually credit. System can also call this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'manager'].includes(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();
    const { employeeId, date, reason, orgId } = body;

    if (!employeeId || !date) {
      return NextResponse.json({ error: 'employeeId and date are required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    const workDate = new Date(date);
    const year = workDate.getFullYear();

    // Check if the date is a weekly off or an org holiday
    const dateStr = workDate.toISOString().split('T')[0];
    const holidayQuery: Record<string, unknown> = { date: dateStr, isActive: true };
    if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
      holidayQuery.orgId = new mongoose.Types.ObjectId(orgId);
    }
    const holiday = await Holiday.findOne(holidayQuery).lean();
    const isHoliday = !!holiday;

    const user = await User.findById(employeeId).select('workSchedule').lean() as any;
    const policy = await getPolicyForUser(employeeId);
    const weekOffs = Array.isArray(user?.workSchedule?.weekOffs) && user.workSchedule.weekOffs.length > 0
      ? user.workSchedule.weekOffs
      : Array.isArray(policy?.weeklyOffDays) ? policy.weeklyOffDays : [];
    const isWeekOff = weekOffs.map((d: string) => d.toLowerCase()).includes(weekdayName(dateStr).toLowerCase());

    if (!isWeekOff && !isHoliday) {
      return NextResponse.json({
        error: 'Comp-off can only be credited for work done on a weekly off or a declared holiday',
      }, { status: 400 });
    }

    const existing = await CompOffCredit.findOne({ employeeId, date: dateStr });
    if (existing) {
      return NextResponse.json({ ok: true, credited: false, reason: 'already_credited' });
    }

    await CompOffCredit.create({
      employeeId,
      date: dateStr,
      source: isHoliday ? 'holiday' : 'week_off',
    });

    const balance = await LeaveBalance.findOneAndUpdate(
      { employeeId: new mongoose.Types.ObjectId(employeeId), year },
      { $inc: { 'comp_off.total': 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean() as any;

    return NextResponse.json({
      ok: true,
      message: `Comp-off credited for ${dateStr}${isHoliday ? ' (Holiday)' : ' (Week Off)'}${reason ? `: ${reason}` : ''}`,
      data: {
        employeeId,
        date: dateStr,
        comp_off_total: balance?.comp_off?.total ?? 0,
        comp_off_used: balance?.comp_off?.used ?? 0,
        comp_off_available: (balance?.comp_off?.total ?? 0) - (balance?.comp_off?.used ?? 0) - (balance?.comp_off?.pending ?? 0),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to credit comp-off';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/leaves/comp-off?employeeId=xxx&year=2026
 * Returns comp-off balance for an employee
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const balance = await LeaveBalance.findOne({ employeeId, year }).lean() as any;
    if (!balance) {
      return NextResponse.json({ ok: true, data: { comp_off: { total: 0, used: 0, pending: 0 } } });
    }

    return NextResponse.json({
      ok: true,
      data: {
        comp_off: balance.comp_off,
        available: balance.comp_off.total - balance.comp_off.used - balance.comp_off.pending,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comp-off balance' }, { status: 500 });
  }
}
