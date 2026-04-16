import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { getISTDateStr } from '@/lib/attendance-utils';

function getMonthRange(ym?: string) {
  const base = ym && /^\d{4}-\d{2}$/.test(ym) ? `${ym}-01` : `${getISTDateStr().slice(0, 7)}-01`;
  const start = base;
  const end = `${base.slice(0, 7)}-31`;
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const month = searchParams.get('month');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const employeeIdParam = searchParams.get('employeeId');

    let employeeId = user.id;
    if ((user.role === 'admin' || user.role === 'manager') && employeeIdParam) {
      employeeId = employeeIdParam;
    }

    await connectDB();
    const range = start && end ? { start, end } : (month ? getMonthRange(month || undefined) : null);

    const match: any = { employeeId };
    if (range) match.date = { $gte: range.start, $lte: range.end };
    if (status) match.dayStatus = status;

    const total = await Attendance.countDocuments(match);
    const rows = await Attendance.find(match)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean() as any[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = rows.map((r: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstWork = (r.sessions || []).find((s: any) => (s.type || 'work') !== 'break');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastClosed = [...(r.sessions || [])].reverse().find((s: any) => !!s.checkOut);
      return {
        date: r.date,
        dayStatus: r.dayStatus || 'Absent',
        workMode: r.workMode || 'Absent',
        totalWorkMins: Number(r.totalWorkMins || 0),
        totalBreakMins: Number(r.totalBreakMins || 0),
        lateByMins: Number(r.lateByMins || 0),
        earlyByMins: Number(r.earlyByMins || 0),
        isCheckedIn: !!r.isCheckedIn,
        firstCheckIn: firstWork?.checkIn || null,
        lastCheckOut: lastClosed?.checkOut || null,
      };
    });

    const summaryMatch = { ...match };
    if (status) delete summaryMatch.dayStatus;
    const summaryAgg = await Attendance.aggregate([
      { $match: summaryMatch },
      { $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: { $sum: { $cond: [{ $ne: ['$dayStatus', 'Absent'] }, 1, 0] } },
        lateDays: { $sum: { $cond: [{ $eq: ['$dayStatus', 'Late'] }, 1, 0] } },
        earlyDays: { $sum: { $cond: [{ $eq: ['$dayStatus', 'Early'] }, 1, 0] } },
        totalWorkMins: { $sum: '$totalWorkMins' },
      }},
    ]);
    const summaryRecord = summaryAgg[0] || { totalDays: 0, presentDays: 0, lateDays: 0, earlyDays: 0, totalWorkMins: 0 };

    return NextResponse.json({
      ok: true,
      range,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      records,
      summary: {
        totalDays: summaryRecord.totalDays || 0,
        presentDays: summaryRecord.presentDays || 0,
        absentDays: Math.max(0, (summaryRecord.totalDays || 0) - (summaryRecord.presentDays || 0)),
        lateDays: summaryRecord.lateDays || 0,
        earlyDays: summaryRecord.earlyDays || 0,
        totalWorkMins: summaryRecord.totalWorkMins || 0,
      },
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
