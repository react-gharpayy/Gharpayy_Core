import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getISTDateStr } from '@/lib/attendance-utils';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Kudo from '@/models/Kudo';
import Task from '@/models/Task';
import User from '@/models/User';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'employee') return NextResponse.json({ error: 'Employee only' }, { status: 403 });

    await connectDB();

    const userId = user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch recent events from all relevant collections in parallel
    const [recentAttendance, recentLeaves, recentKudos, recentTasks] = await Promise.all([
      // Recent attendance check-ins by ANY user (for team feed) — limit to 5
      Attendance.find({
        date: getISTDateStr(),
        workMode: { $ne: 'Absent' },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('employeeId workMode updatedAt dayStatus')
        .lean(),

      // My own leaves
      Leave.find({
        employeeId: userId,
        updatedAt: { $gte: sevenDaysAgo },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),

      // Kudos received by me or given by me
      Kudo.find({
        $or: [{ toId: userId }, { fromId: userId }],
        createdAt: { $gte: sevenDaysAgo },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // My own tasks recently updated
      Task.find({
        assignedTo: userId,
        updatedAt: { $gte: sevenDaysAgo },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Resolve employee names for attendance feed
    const empIds = [...new Set(recentAttendance.map((a: any) => a.employeeId?.toString()).filter(Boolean))];
    const empUsers = empIds.length
      ? await User.find({ _id: { $in: empIds } }, 'fullName').lean()
      : [];
    const empMap = new Map(empUsers.map((u: any) => [u._id.toString(), u.fullName]));

    // Build unified activity feed
    const activities: { type: string; label: string; timestamp: string }[] = [];

    for (const a of recentAttendance) {
      const name = empMap.get((a as any).employeeId?.toString()) || 'A teammate';
      activities.push({
        type: 'attendance',
        label: `${name} marked attendance`,
        timestamp: (a as any).updatedAt?.toISOString?.() || new Date().toISOString(),
      });
    }

    for (const l of recentLeaves) {
      const action = (l as any).status === 'approved' ? 'Leave approved' : (l as any).status === 'rejected' ? 'Leave rejected' : 'Leave applied';
      activities.push({
        type: 'leave',
        label: `${action} · ${(l as any).leaveType} leave`,
        timestamp: (l as any).updatedAt?.toISOString?.() || new Date().toISOString(),
      });
    }

    for (const k of recentKudos) {
      const isReceived = (k as any).toId === userId;
      activities.push({
        type: 'kudos',
        label: isReceived
          ? `${(k as any).fromName} gave you a Kudo for "${(k as any).tag}"`
          : `You gave a Kudo to ${(k as any).toName} for "${(k as any).tag}"`,
        timestamp: (k as any).createdAt?.toISOString?.() || new Date().toISOString(),
      });
    }

    for (const t of recentTasks) {
      if ((t as any).status === 'completed') {
        activities.push({
          type: 'task',
          label: `You completed task: "${(t as any).title}"`,
          timestamp: (t as any).completedAt?.toISOString?.() || (t as any).updatedAt?.toISOString?.() || new Date().toISOString(),
        });
      } else if ((t as any).status === 'todo' && (t as any).createdAt >= sevenDaysAgo) {
        activities.push({
          type: 'task',
          label: `New task assigned: "${(t as any).title}"`,
          timestamp: (t as any).createdAt?.toISOString?.() || new Date().toISOString(),
        });
      }
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ ok: true, activities: activities.slice(0, 10) });
  } catch (e) {
    console.error('[dashboard/activity]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
