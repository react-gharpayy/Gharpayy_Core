import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { canAccessCoaching } from '@/lib/permissions';
import CoachingSession from '@/models/CoachingSession';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Task from '@/models/Task';
import Tracker from '@/models/Tracker';
import { AIProvider } from '@/lib/ai-provider';
import { connectDB } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !canAccessCoaching(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { employeeId, sessionId } = await req.json();
    if (!employeeId || !sessionId) {
      return NextResponse.json({ error: 'Missing employeeId or sessionId' }, { status: 400 });
    }

    await connectDB();

    const [session, employee] = await Promise.all([
      CoachingSession.findById(sessionId).lean(),
      User.findById(employeeId).select('fullName role department teamId').lean()
    ]);

    if (!session || !employee) {
      return NextResponse.json({ error: 'Session or employee not found' }, { status: 404 });
    }

    // Aggregate stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [attendances, tasks, trackers] = await Promise.all([
      Attendance.find({ employeeId, date: { $gte: thirtyDaysAgoStr } }).select('dayStatus').lean(),
      Task.find({ assignedTo: employeeId }).select('status dueDate').lean(),
      Tracker.find({ employeeId, date: { $gte: thirtyDaysAgoStr } }).select('_id').lean()
    ]);

    const lateCount = attendances.filter(a => a.dayStatus === 'Late').length;
    const absentCount = attendances.filter(a => a.dayStatus === 'Absent').length;
    const activeDays = attendances.length - absentCount;
    const eodConsistency = Math.round((trackers.length / Math.max(1, activeDays)) * 100);
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => t.status === 'overdue' || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed')).length;
    const taskCompletionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 100;

    const stats = {
      lateLogins: lateCount,
      absentCount,
      eodConsistency,
      completedTasks,
      overdueTasks,
      taskCompletionRate,
      activeDays
    };

    const promptContext = `
Employee: ${(employee as any).fullName}
Role: ${(employee as any).role}
Session Health: ${(session as any).healthStatus}
Shared Notes: ${(session as any).sharedNotes || 'None'}
Private Notes: ${(session as any).privateNotes || 'None'}

Operational Metrics (Last 30 Days):
- Late Logins: ${stats.lateLogins}
- Absences: ${stats.absentCount}
- Daily Tracker Consistency: ${stats.eodConsistency}%
- Overdue Tasks: ${stats.overdueTasks}
- Task Completion Rate: ${stats.taskCompletionRate}%
`;

    const systemPrompt = `You are an Elite Workforce Operations Strategist.
Your goal is to provide a comprehensive, data-driven operational analysis.
Avoid therapy-style language or generic motivational fluff. Behave like an operations consultant.
Focus on accountability, operational reliability, burnout risk, leadership consistency, and execution quality.
You must reference actual metrics, correlate attendance with performance, correlate compliance with reliability, identify contradictions and anomalies, and express uncertainty when evidence is weak.

Respond EXACTLY in this Markdown structure:
## 1. Executive Assessment
[Content]
## 2. Leadership & Reliability Analysis
[Content]
## 3. Burnout / Engagement Risk
[Content]
## 4. Communication & Accountability Signals
[Content]
## 5. Hidden Operational Risks
[Content]
## 6. Tactical Recommendations
[Content]
## 7. 14-Day Intervention Plan
[Content]`;

    const response = await AIProvider.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptContext }
      ],
      { maxTokens: 1500, temperature: 0.5 }
    );

    return NextResponse.json({ ok: true, summary: response.content });
  } catch (error) {
    console.error('[AI Summary API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
