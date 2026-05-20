import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import AttendanceAudit from '@/models/AttendanceAudit';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });

    // Only allow admins or managers to see audits
    if (!['admin', 'manager', 'hr'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { employeeId };
    if (date) query.date = date;

    const skip = (page - 1) * limit;

    const audits = await AttendanceAudit.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actorId', 'fullName role')
      .lean();

    const total = await AttendanceAudit.countDocuments(query);

    return NextResponse.json({
      ok: true,
      audits,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Audit API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
