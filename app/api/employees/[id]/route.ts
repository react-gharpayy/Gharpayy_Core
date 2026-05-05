import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import ExceptionRequest from '@/models/ExceptionRequest';
import Task from '@/models/Task';
import Notice from '@/models/Notice';
import { getAuthUser } from '@/lib/auth';
import Leave from '@/models/Leave';
import { ensureLeaveBalance } from '@/lib/leave-utils';
import mongoose from 'mongoose';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(id)
      .select('-password')
      .populate('officeZoneId', 'name')
      .populate('managerId', 'fullName email')
      .lean() as any;
    if (!user) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (auth.role === 'manager') {
      const mgrId = user.managerId?._id?.toString?.() || user.managerId?.toString?.() || null;
      if (mgrId !== auth.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const [leaveBalance, leaveHistory, attendanceAgg] = await Promise.all([
      ensureLeaveBalance(id),
      Leave.find({ employeeId: id }).sort({ appliedAt: -1 }).limit(100).lean(),
      Attendance.aggregate([
        { $match: { employeeId: new mongoose.Types.ObjectId(id) } },
        { $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $ne: ['$dayStatus', 'Absent'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$dayStatus', 'Late'] }, 1, 0] } },
          earlyDays: { $sum: { $cond: [{ $eq: ['$dayStatus', 'Early'] }, 1, 0] } },
          totalWorkMins: { $sum: '$totalWorkMins' },
          totalBreakMins: { $sum: '$totalBreakMins' },
          firstDate: { $min: '$date' },
          lastDate: { $max: '$date' },
        }},
      ]),
    ]);

    const summary = attendanceAgg[0] || {
      totalDays: 0, presentDays: 0, lateDays: 0, earlyDays: 0,
      totalWorkMins: 0, totalBreakMins: 0, firstDate: null, lastDate: null,
    };

    return NextResponse.json({
      ok: true,
      employee: {
        id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        dateOfBirth: user.dateOfBirth || '',
        jobRole: user.jobRole || '',
        profilePhoto: user.profilePhoto || '',
        officeZone: user.officeZoneId?.name || '',
        teamName: user.teamName || '',
        department: user.department || '',
        manager: user.managerId ? {
          id: String((user.managerId as any)?._id || ''),
          fullName: (user.managerId as any)?.fullName || '',
          email: (user.managerId as any)?.email || '',
        } : null,
        workSchedule: user.workSchedule || null,
        isApproved: !!user.isApproved,
        createdAt: user.createdAt,
      },
      attendanceSummary: {
        ...summary,
        absentDays: Math.max(0, (summary.totalDays || 0) - (summary.presentDays || 0)),
      },
      leaveBalance,
      leaveHistory,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
