import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Leave from '@/models/Leave';

/**
 * GET /api/leaves/team
 * Returns approved/pending leaves for the team in a date range.
 * Query params: startDate, endDate (YYYY-MM-DD), departmentId (optional)
 * Accessible by all authenticated users (ESS team calendar view).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');

    // Default: current month if no dates provided
    const now = new Date();
    const start = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const end = endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {
      status: { $in: ['approved', 'pending'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    };

    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      query.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    const leaves = await Leave.find(query)
      .select('employeeId employeeName leaveType startDate endDate totalDays status isHalfDay halfDaySession')
      .sort({ startDate: 1 })
      .lean();

    // Group by employee for calendar view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped: Record<string, any> = {};
    for (const leave of leaves) {
      const key = leave.employeeId?.toString() || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          employeeId: key,
          employeeName: leave.employeeName,
          leaves: [],
        };
      }
      grouped[key].leaves.push({
        id: leave._id,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDays: leave.totalDays,
        status: leave.status,
        isHalfDay: leave.isHalfDay,
        halfDaySession: leave.halfDaySession,
      });
    }

    return NextResponse.json({
      ok: true,
      rangeStart: start,
      rangeEnd: end,
      employees: Object.values(grouped),
      total: leaves.length,
    });
  } catch (e) {
    console.error('[leaves/team GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
