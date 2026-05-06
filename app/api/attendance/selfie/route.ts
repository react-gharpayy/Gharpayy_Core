import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getAuthUser } from '@/lib/auth';
import { getISTDateStr } from '@/lib/attendance-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const sessionIndex = parseInt(searchParams.get('sessionIndex') || '0', 10);
    const date = searchParams.get('date') || getISTDateStr();

    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });

    await connectDB();

    // Use lean() + select only sessions to get raw MongoDB data,
    // bypassing any Mongoose schema field stripping from model cache
    const att = await Attendance.findOne(
      { employeeId, date },
      { sessions: 1 }
    ).lean() as any;

    if (!att) return NextResponse.json({ error: 'No attendance record' }, { status: 404 });

    const session = att.sessions?.[sessionIndex];
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const selfieImage = session.selfieImage;
    if (!selfieImage) {
      // Debug: log what fields are actually present in the session
      return NextResponse.json({ error: 'No selfie for this session', sessionFields: Object.keys(session) }, { status: 404 });
    }

    return NextResponse.json({ selfieImage });
  } catch (e) {
    console.error('Selfie API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
