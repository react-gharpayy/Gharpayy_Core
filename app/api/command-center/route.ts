import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import Task from '@/models/Task';
import ExceptionRequest from '@/models/ExceptionRequest';
import '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';
import { getISTDateStr } from '@/lib/attendance-utils';

function fmtTime(d: Date) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const today = getISTDateStr();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employees = await User.find({ isApproved: true, role: 'employee' }, 'fullName email officeZoneId')
      .select('-profilePhoto')
      .populate('officeZoneId', 'name').lean() as any[];
    const total = employees.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const todayAtt = await Attendance.find({ employeeId: { $in: employees.map(e => e._id) }, date: today }).lean() as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attMap = new Map(todayAtt.map((a: any) => [a.employeeId.toString(), a]));
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const yDate = y.toISOString().split('T')[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yAtt = await Attendance.find({ employeeId: { $in: employees.map(e => e._id) }, date: yDate }).lean() as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yesterdayPresent = yAtt.filter((a: any) => (a.dayStatus || 'Absent') !== 'Absent').length;

    let presentCount = 0, absentCount = 0, lateCount = 0, earlyCount = 0, onTimeCount = 0, breakCount = 0, fieldCount = 0;

    const teamPulse = employees.map(emp => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const att = attMap.get(emp._id.toString()) as any;
      let workMode = 'Absent', dayStatus = 'Absent', checkInTime = null;
      if (att) {
        workMode = att.workMode || (att.isOnBreak ? 'Break' : att.isInField ? 'Field' : att.isCheckedIn ? 'Present' : 'Absent');
        dayStatus = att.dayStatus || 'Absent';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstWork = att.sessions?.find((s: any) => s.type === 'work' || !s.type);
        if (firstWork) checkInTime = fmtTime(new Date(firstWork.checkIn));
      }
      if (workMode === 'Present') presentCount++;
      else if (workMode === 'Break') { presentCount++; breakCount++; }
      else if (workMode === 'Field') { presentCount++; fieldCount++; }
      else absentCount++;
      if (dayStatus === 'Late') lateCount++;
      if (dayStatus === 'Early') earlyCount++;
      if (dayStatus === 'On Time') onTimeCount++;
      return { employeeId: emp._id.toString(), employeeName: emp.fullName, team: (emp.officeZoneId as Record<string, unknown>)?.name || 'No Zone', workMode, dayStatus, checkInTime };
    }).sort((a, b) => {
      const o: Record<string, number> = { Present: 0, Break: 1, Field: 2, WFH: 3, Absent: 4 };
      return (o[a.workMode] ?? 4) - (o[b.workMode] ?? 4);
    });

    const taskSummary = { blocked: 0, overdue: 0, total: 0, completed: 0 };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tasks = await Task.find({}).lean() as any[];
      taskSummary.total = tasks.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskSummary.blocked = tasks.filter((t: any) => t.status === 'blocked').length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskSummary.overdue = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && t.dueDate < today).length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskSummary.completed = tasks.filter((t: any) => t.status === 'completed').length;
    } catch { /* ignore */ }

    let pendingApprovals = 0;
    try { pendingApprovals = await ExceptionRequest.countDocuments({ status: 'pending' }); } catch { /* ignore */ }

    const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    const onTimeRate = presentCount > 0 ? Math.round((onTimeCount / Math.max(presentCount, 1)) * 100) : 0;
    const taskCompletionRate = taskSummary.total > 0 ? Math.round((taskSummary.completed / taskSummary.total) * 100) : 72;
    const breakDiscipline = Math.max(0, 100 - (breakCount * 5));
    const healthScore = Math.round((attendanceRate * 0.5) + (onTimeRate * 0.3) + (taskCompletionRate * 0.2));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const needAction: any[] = [];
    if (taskSummary.blocked > 0) needAction.push({ type: 'blocked_tasks', count: taskSummary.blocked, label: `${taskSummary.blocked} blocked task${taskSummary.blocked > 1 ? 's' : ''}` });
    if (lateCount > 0) needAction.push({ type: 'late', count: lateCount, label: `${lateCount} employee${lateCount > 1 ? 's' : ''} late today` });
    if (taskSummary.overdue > 0) needAction.push({ type: 'overdue', count: taskSummary.overdue, label: `${taskSummary.overdue} overdue task${taskSummary.overdue > 1 ? 's' : ''}` });
    if (presentCount < yesterdayPresent) {
      needAction.push({ type: 'attendance_drop', count: yesterdayPresent - presentCount, label: `Attendance drop vs yesterday: -${yesterdayPresent - presentCount}` });
    }

    return NextResponse.json({
      ok: true, date: today,
      summary: { total, present: presentCount, absent: absentCount, late: lateCount, early: earlyCount, onTime: onTimeCount, onBreak: breakCount, inField: fieldCount, activeNow: presentCount },
      compare: { yesterdayPresent, presentDelta: presentCount - yesterdayPresent },
      healthScore,
      kpis: { attendance: attendanceRate, onTimeRate, taskCompletion: taskCompletionRate, breakDiscipline },
      teamPulse, taskSummary, pendingApprovals, needAction,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
