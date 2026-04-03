import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getISTDateStr } from '@/lib/attendance-utils';
import { verifyIntegrationRequest } from '@/lib/integration-auth';

export async function GET(req: Request) {
  try {
    verifyIntegrationRequest(req as any);
    await connectDB();

    const date = getISTDateStr();
    const [totalEmployees, attendanceRows] = await Promise.all([
      User.countDocuments({ role: 'employee', isApproved: true }),
      Attendance.find({ date }).select('dayStatus').lean(),
    ]);

    const presentCount = attendanceRows.filter((r: any) => (r.dayStatus || 'Absent') !== 'Absent').length;
    const lateCount = attendanceRows.filter((r: any) => r.dayStatus === 'Late').length;
    const earlyCount = attendanceRows.filter((r: any) => r.dayStatus === 'Early').length;
    const absentCount = Math.max(0, (totalEmployees || 0) - presentCount);

    return NextResponse.json({
      date,
      totalEmployees: totalEmployees || 0,
      present: presentCount,
      late: lateCount,
      early: earlyCount,
      absent: absentCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
