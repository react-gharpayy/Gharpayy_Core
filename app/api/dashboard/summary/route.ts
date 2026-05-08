import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getISTDateStr } from '@/lib/attendance-utils';
import Attendance from '@/models/Attendance';
import Task from '@/models/Task';
import Leave from '@/models/Leave';
import Tracker from '@/models/Tracker';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'employee') return NextResponse.json({ error: 'Employee only' }, { status: 403 });

    await connectDB();

    const today = getISTDateStr();
    const userId = user.id;

    // ── Attendance: last 7 days for trend ──────────────────────
    const sevenDaysAgo = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return getISTDateStr(d);
    })();

    const [recentAttendance, tasks, leaves, tracker] = await Promise.all([
      Attendance.find({
        employeeId: userId,
        date: { $gte: sevenDaysAgo, $lte: today },
      }).sort({ date: 1 }).lean(),

      Task.find({ assignedTo: userId }).sort({ createdAt: -1 }).lean(),

      Leave.find({ employeeId: userId }).sort({ createdAt: -1 }).lean(),

      Tracker.findOne({ employeeId: userId, date: today }).lean(),
    ]);

    // ── Attendance trend (last 7 days) ──────────────────────────
    const attendanceTrend = recentAttendance.map((a: any) => ({
      date: a.date,
      present: a.workMode !== 'Absent',
      onTime: a.dayStatus === 'On Time' || a.dayStatus === 'Early',
      workMins: a.totalWorkMins || 0,
    }));

    const presentDays = attendanceTrend.filter(d => d.present).length;
    const onTimeDays = attendanceTrend.filter(d => d.onTime).length;
    const attendanceRate = attendanceTrend.length > 0 ? Math.round((presentDays / attendanceTrend.length) * 100) : null;
    const punctualityRate = presentDays > 0 ? Math.round((onTimeDays / presentDays) * 100) : null;

    // Average work hours over attended days
    const avgWorkMins = presentDays > 0
      ? Math.round(attendanceTrend.filter(d => d.present).reduce((s, d) => s + d.workMins, 0) / presentDays)
      : null;

    // ── Tasks summary ──────────────────────────────────────────
    const taskStats = {
      total: tasks.length,
      pending: tasks.filter((t: any) => t.status === 'todo' || t.status === 'in_progress').length,
      overdue: tasks.filter((t: any) => t.status === 'overdue').length,
      completed: tasks.filter((t: any) => t.status === 'completed').length,
      blocked: tasks.filter((t: any) => t.status === 'blocked').length,
    };

    // ── Leaves summary ─────────────────────────────────────────
    const leaveStats = {
      pending: leaves.filter((l: any) => l.status === 'pending').length,
      approved: leaves.filter((l: any) => l.status === 'approved').length,
      total: leaves.length,
    };

    // ── Pending actions for this employee ─────────────────────
    const pendingActions: { title: string; desc: string; urgency: string; href: string }[] = [];

    if (taskStats.overdue > 0) {
      pendingActions.push({
        title: 'Overdue Tasks',
        desc: `${taskStats.overdue} task${taskStats.overdue > 1 ? 's' : ''} past their due date`,
        urgency: 'high',
        href: '/my-tasks',
      });
    }
    if (leaveStats.pending > 0) {
      pendingActions.push({
        title: 'Leave Awaiting Approval',
        desc: `${leaveStats.pending} leave request${leaveStats.pending > 1 ? 's' : ''} pending`,
        urgency: 'medium',
        href: '/my-leaves',
      });
    }
    if (taskStats.blocked > 0) {
      pendingActions.push({
        title: 'Blocked Tasks',
        desc: `${taskStats.blocked} task${taskStats.blocked > 1 ? 's' : ''} marked as blocked`,
        urgency: 'medium',
        href: '/my-tasks',
      });
    }

    // ── Tracker check-ins for today's schedule ─────────────────
    const checkins = (tracker as any)?.dailyCheckins || [];

    return NextResponse.json({
      ok: true,
      attendanceTrend: attendanceTrend.map(d => ({ date: d.date, present: d.present, onTime: d.onTime, workMins: d.workMins })),
      stats: {
        attendanceRate,
        punctualityRate,
        avgWorkMins,
      },
      taskStats,
      leaveStats,
      pendingActions,
      checkins,
    });
  } catch (e) {
    console.error('[dashboard/summary]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
