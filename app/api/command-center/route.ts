import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import Task from '@/models/Task';
import ExceptionRequest from '@/models/ExceptionRequest';
import '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';

function getISTDate() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}
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
    const today = getISTDate();

    const employees = await User.find({ isApproved: true, role: 'employee' }, 'fullName email officeZoneId')
      .populate('officeZoneId', 'name').lean() as any[];
    const total = employees.length;

    const todayAtt = await Attendance.find({ employeeId: { $in: employees.map(e => e._id) }, date: today }).lean() as any[];
    const attMap = new Map(todayAtt.map((a: any) => [a.employeeId.toString(), a]));

    let presentCount = 0, absentCount = 0, lateCount = 0, earlyCount = 0, onTimeCount = 0, breakCount = 0, fieldCount = 0;

    const teamPulse = employees.map(emp => {
      const att = attMap.get(emp._id.toString()) as any;
      let workMode = 'Absent', dayStatus = 'Absent', checkInTime = null;
      if (att) {
        workMode = att.workMode || (att.isOnBreak ? 'Break' : att.isInField ? 'Field' : att.isCheckedIn ? 'Present' : 'Absent');
        dayStatus = att.dayStatus || 'Absent';
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
      return { employeeId: emp._id.toString(), employeeName: emp.fullName, team: (emp.officeZoneId as any)?.name || 'No Zone', workMode, dayStatus, checkInTime };
    }).sort((a, b) => {
      const o: any = { Present: 0, Break: 1, Field: 2, WFH: 3, Absent: 4 };
      return (o[a.workMode] ?? 4) - (o[b.workMode] ?? 4);
    });

    const taskSummary = { blocked: 0, overdue: 0, total: 0, completed: 0 };
    try {
      const tasks = await Task.find({}).lean() as any[];
      taskSummary.total = tasks.length;
      taskSummary.blocked = tasks.filter((t: any) => t.status === 'blocked').length;
      taskSummary.overdue = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && t.dueDate < today).length;
      taskSummary.completed = tasks.filter((t: any) => t.status === 'completed').length;
    } catch {}

    let pendingApprovals = 0;
    try { pendingApprovals = await ExceptionRequest.countDocuments({ status: 'pending' }); } catch {}

    const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    const onTimeRate = presentCount > 0 ? Math.round((onTimeCount / Math.max(presentCount, 1)) * 100) : 0;
    const taskCompletionRate = taskSummary.total > 0 ? Math.round((taskSummary.completed / taskSummary.total) * 100) : 72;
    const breakDiscipline = Math.max(0, 100 - (breakCount * 5));
    const healthScore = Math.round((attendanceRate * 0.5) + (onTimeRate * 0.3) + (taskCompletionRate * 0.2));

    const needAction: any[] = [];
    if (taskSummary.blocked > 0) needAction.push({ type: 'blocked_tasks', count: taskSummary.blocked, label: `${taskSummary.blocked} blocked task${taskSummary.blocked > 1 ? 's' : ''}` });
    if (lateCount > 0) needAction.push({ type: 'late', count: lateCount, label: `${lateCount} employee${lateCount > 1 ? 's' : ''} late today` });
    if (taskSummary.overdue > 0) needAction.push({ type: 'overdue', count: taskSummary.overdue, label: `${taskSummary.overdue} overdue task${taskSummary.overdue > 1 ? 's' : ''}` });

    return NextResponse.json({
      ok: true, date: today,
      summary: { total, present: presentCount, absent: absentCount, late: lateCount, early: earlyCount, onTime: onTimeCount, onBreak: breakCount, inField: fieldCount, activeNow: presentCount },
      healthScore,
      kpis: { attendance: attendanceRate, onTimeRate, taskCompletion: taskCompletionRate, breakDiscipline },
      teamPulse, taskSummary, pendingApprovals, needAction,
    });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
