import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isElevated } from '@/lib/role-guards';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !isElevated(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { employeeName, stats, notes, actionItems } = await req.json();

    // --- ADVANCED CONTEXTUAL SYNTHESIS ENGINE ---
    
    // 1. Identify Predominant Operational Character
    let profile = 'on-track';
    if (stats.riskScore >= 100 || stats.lateLogins > 10 || stats.absentCount > 3) profile = 'critical';
    else if (stats.lateLogins > 3) profile = 'attendance-risk';
    else if (stats.taskCompletionRate < 60 || stats.overdueTasks > 5) profile = 'execution-risk';
    else if (stats.eodConsistency < 75) profile = 'reporting-risk';
    else if (stats.taskCompletionRate > 90 && stats.lateLogins === 0 && stats.eodConsistency > 95) profile = 'high-performer';

    // 2. Dynamic Operational Snapshot (Prose)
    const snapshots = {
      'critical': `${employeeName} is currently exhibiting deep operational instability. A pervasive pattern of ${stats.lateLogins > 0 ? 'punctuality failures' : 'execution gaps'} has compromised their role reliability, necessitating a total reset of operational expectations and immediate behavioral correction.`,
      'attendance-risk': `${employeeName}'s performance is being primarily undermined by persistent punctuality issues. While their execution remains functional, the ${stats.lateLogins} late logins this cycle indicate a breakdown in professional discipline that requires immediate alignment.`,
      'execution-risk': `The primary bottleneck for ${employeeName} is currently execution velocity. A build-up of ${stats.overdueTasks} overdue items suggests a struggle with bandwidth management or task prioritization that is affecting overall sprint stability.`,
      'reporting-risk': `${employeeName} is maintaining a decent operational rhythm, but their visibility is low due to poor reporting consistency. The ${stats.eodConsistency}% EOD rate suggests a lack of accountability in documenting daily progress and blockers.`,
      'high-performer': `${employeeName} is currently operating at an elite level. Their combination of perfect attendance and ${stats.taskCompletionRate}% task velocity makes them a primary candidate for expanded leadership responsibilities and mentorship roles.`,
      'on-track': `${employeeName} continues to provide a stable foundation for the team. They are meeting all core benchmarks, with only minor refinements needed in ${stats.eodConsistency < 100 ? 'reporting transparency' : 'execution speed'}.`
    };

    // 3. Primary Concerns (Context-Specific)
    const concernLibrary: any = {
      'critical': ['total role misalignment', 'attendance reliability collapse', 'execution accountability breakdown'],
      'attendance-risk': ['shift punctuality', 'operational discipline', 'start-of-day momentum'],
      'execution-risk': ['sprint velocity', 'task prioritization', 'unblocking pending items'],
      'reporting-risk': ['visibility of work', 'accountability documentation', 'communication discipline'],
      'high-performer': ['bandwidth for leadership', 'complex project ownership', 'team-wide mentorship'],
      'on-track': ['incremental velocity gains', 'maintaining consistency', 'reporting precision']
    };

    // 4. Recommended Discussion Focus (Actionable)
    const focusLibrary: any = {
      'critical': ['Understand root causes of total reliability breakdown', 'Set firm deadlines for immediate behavioral correction', 'Define the threshold for continued role alignment'],
      'attendance-risk': ['Discuss morning routine and shift preparation hurdles', 'Re-align on the impact of punctuality on team operations', 'Commit to a zero-late-login streak for the next cycle'],
      'execution-risk': ['Perform a deep dive into current task blockers', 'Review prioritization framework for incoming sprint items', 'Analyze bandwidth allocation vs. task complexity'],
      'reporting-risk': ['Re-establish the "Why" behind daily reporting transparency', 'Identify blockers in the end-of-day wrap-up process', 'Align on expectations for clear blocker documentation'],
      'high-performer': ['Identify areas where they can take leadership ownership', 'Discuss career trajectory and future growth opportunities', 'Leverage their efficiency to mentor struggling team members'],
      'on-track': ['Identify "good to great" opportunities in current workflow', 'Review any minor friction points in reporting', 'Discuss interest in higher-complexity task assignments']
    };

    // 5. Action Commitments (Measurable)
    const commitmentLibrary: any = {
      'critical': ['Achieve 100% attendance punctuality for 30 consecutive days', 'Clear all overdue tasks within 48 hours', 'Twice-daily check-ins with reporting manager'],
      'attendance-risk': ['Maintain zero late logins for the upcoming 14-day cycle', 'Report for shift 5 minutes early to ensure operational readiness', 'Immediate notification of any potential punctuality hurdles'],
      'execution-risk': ['Clear all existing ${stats.overdueTasks} overdue items by end of week', 'Implement a daily "top-3" prioritization ritual', 'Maintain a task completion rate of >85% for the next sprint'],
      'reporting-risk': ['Achieve 100% EOD consistency for the next 20 active days', 'Ensure EOD reports include specific quantified achievements', 'Submit all daily updates before the 15-minute grace period'],
      'high-performer': ['Draft a process improvement document for the team', 'Take ownership of one major high-complexity project', 'Conduct a knowledge-sharing session for junior members'],
      'on-track': ['Maintain current benchmarks while refining reporting speed', 'Submit daily logs with 100% detail accuracy', 'Onboard for one "stretch-goal" task outside current scope']
    };

    // 6. Overall Assessment (Prose)
    const assessments = {
      'critical': 'Status is critical. Performance alignment is now the primary priority for this role.',
      'attendance-risk': 'Status requires monitoring. Discipline alignment needed to maintain role stability.',
      'execution-risk': 'Status is high-focus. Velocity recovery needed to meet departmental targets.',
      'reporting-risk': 'Status is stable but low-visibility. Reporting alignment required for transparency.',
      'high-performer': 'Status is exceptional. Focus on growth, retention, and leadership scaling.',
      'on-track': 'Status is consistent. Maintain current benchmarks and monitor for growth opportunities.'
    };

    // --- ASSEMBLE PERSONALIZED OUTPUT ---
    const activeProfile = profile as keyof typeof snapshots;
    
    let summary = `1. OPERATIONAL ANALYSIS\n${snapshots[activeProfile]}\n\n`;
    
    summary += `2. KEY PERFORMANCE SIGNALS\n`;
    if (stats.lateLogins > 0) summary += `• Recorded ${stats.lateLogins} late logins this cycle\n`;
    if (stats.taskCompletionRate < 90) summary += `• Current execution velocity at ${stats.taskCompletionRate}%\n`;
    if (stats.overdueTasks > 0) summary += `• Managing ${stats.overdueTasks} overdue operational items\n`;
    if (stats.eodConsistency < 100) summary += `• Reporting consistency currently at ${stats.eodConsistency}%\n`;
    if (stats.riskScore === 0) summary += `• Perfect operational reliability across all signals\n`;
    summary += `\n`;

    summary += `3. PRIMARY CONCERNS\n`;
    concernLibrary[activeProfile].forEach((c: string) => summary += `• ${c}\n`);
    summary += `\n`;

    summary += `4. RECOMMENDED DISCUSSION FOCUS\n`;
    focusLibrary[activeProfile].forEach((f: string) => summary += `• ${f}\n`);
    if (notes && notes.length > 30) {
      summary += `• Follow up on specific discussion point: "${notes.split('\n')[0].substring(0, 60)}..."\n`;
    }
    summary += `\n`;

    summary += `5. FORWARD ACTION COMMITMENTS\n`;
    commitmentLibrary[activeProfile].forEach((c: string) => summary += `• ${c}\n`);
    summary += `\n`;

    summary += `6. OVERALL CLASSIFICATION\n${assessments[activeProfile]}`;

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error('[Generate Summary API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate contextual summary' }, { status: 500 });
  }
}
