import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import ExceptionRequest from '@/models/ExceptionRequest';
import Task from '@/models/Task';
import Notice from '@/models/Notice';
import { getAuthUser } from '@/lib/auth';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { id } = await context.params;

    await connectDB();

    // Cascading delete - remove related records first
    await Promise.all([
      Attendance.deleteMany({ employeeId: id }),
      ExceptionRequest.deleteMany({ employeeId: id }),
      Task.deleteMany({ assignedTo: id }),
      Notice.deleteMany({ targetId: id }),
    ]);

    await User.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
