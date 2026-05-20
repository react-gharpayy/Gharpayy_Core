import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import Task from '@/models/Task';
import Tracker from '@/models/Tracker';
import User from '@/models/User';
import CoachingSession from '@/models/CoachingSession';
import { getAuthUser } from '@/lib/auth';
import { canAccessCoaching } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !canAccessCoaching(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Valid employeeId is required' }, { status: 400 });
    }

    await connectDB();
    const eid = new mongoose.Types.ObjectId(employeeId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const from = thirtyDaysAgo.toISOString().split('T')[0];

    const [employee, attendanceRecords, tasks, trackers, previousSessions, latestHealthResult] = await Promise.all([
      User.findById(employeeId).select('fullName playbookRole teamName email').lean(),
      Attendance.find({ employeeId: eid, date: { $gte: from } }).sort({ date: 1 }).lean(),
      Task.find({ assignedTo: eid }).sort({ createdAt: -1 }).limit(50).lean(),
      Tracker.find({ employeeId: eid, date: { $gte: from } }).sort({ date: -1 }).lean(),
      CoachingSession.find({ employeeId: eid, status: 'completed' }).sort({ scheduledAt: -1 }).limit(5).lean(),
      CoachingSession.findOne({ employeeId: eid, status: { $ne: 'cancelled' } }).sort({ scheduledAt: -1 }).select('healthStatus').lean()
    ]);

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const currentHealth = (latestHealthResult as any)?.healthStatus || 'doing-well';
    
    let lateCount = 0, absentCount = 0, onTimeCount = 0;
    attendanceRecords.forEach(a => {
      if (a.dayStatus === 'Late') lateCount++;
      else if (a.dayStatus === 'Absent') absentCount++;
      else onTimeCount++;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    let overdueCount = 0, completedCount = 0;
    tasks.forEach(t => {
      if (t.status === 'completed') completedCount++;
      else if (t.status === 'overdue' || (t.dueDate && t.dueDate < todayStr && t.status !== 'cancelled')) overdueCount++;
    });
    const taskCompletionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    const activeDays = attendanceRecords.filter(a => a.dayStatus !== 'Absent').length;
    const expectedEod = Math.max(1, activeDays);
    const eodConsistency = Math.round((trackers.length / expectedEod) * 100);

    let riskScore = 0;
    const riskBreakdown = [];
    
    // Health Overrides
    if (currentHealth === 'immediate-support') { riskScore += 60; riskBreakdown.push('Admin: Immediate Support'); }
    else if (currentHealth === 'needs-attention') { riskScore += 30; riskBreakdown.push('Admin: Needs Attention'); }

    if (lateCount > 0) { riskScore += lateCount * 10; riskBreakdown.push(`${lateCount} lates`); }
    if (absentCount > 0) { riskScore += absentCount * 25; riskBreakdown.push(`${absentCount} absences`); }
    if (overdueCount > 0) { riskScore += overdueCount * 15; riskBreakdown.push(`${overdueCount} overdue items`); }
    if (eodConsistency < 85 && expectedEod > 2) { riskScore += 30; riskBreakdown.push(`Low reporting (${eodConsistency}%)`); }

    const classification = riskScore >= 40 ? 'Needs Attention' : (taskCompletionRate >= 85 ? 'High Performer' : 'On Track');

    return NextResponse.json({
      ok: true,
      data: {
        employee,
        currentHealth,
        analytics: {
          lateLogins: lateCount,
          absentCount,
          onTimeCount,
          overdueTasks: overdueCount,
          taskCompletionRate,
          eodConsistency,
          riskScore,
          classification,
          riskBreakdown
        },
        previousSessions: previousSessions.map((s: any) => ({
          _id: s._id?.toString(),
          scheduledAt: s.scheduledAt,
          aiSummary: s.aiSummary || 'Performance Sync',
          healthStatus: s.healthStatus
        }))
      }
    });
  } catch (e) {
    console.error('[employee-context GET]', e);
    return NextResponse.json({ error: 'Failed to load pulse data' }, { status: 500 });
  }
}
