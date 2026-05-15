/**
 * modules/coach-ai/lib/engines/performance-engine.ts
 */

export const analyzePerformance = (data: any) => {
  const { taskSummary, kpis, teamPulse } = data;
  
  const topPerformers = teamPulse
    .filter((p: any) => p.dayStatus === 'On Time' && p.workMode === 'Present')
    .slice(0, 5);

  return `
# PERFORMANCE & VELOCITY BRIEFING

Operational velocity is currently clocked at **${kpis.taskCompletion}%** task completion.

## Task Execution State
- **Total Tasks**: ${taskSummary.total}
- **Completed**: ${taskSummary.completed}
- **Blocked**: ${taskSummary.blocked} (Critical priority)
- **Overdue**: ${taskSummary.overdue}

## Top Performing Operators (A-Tier Consistency)
${topPerformers.map((p: any) => `- **${p.employeeName}** [${p.team} Hub]`).join('\n')}

**Executive Insight:**
Task blockage in the current cycle is preventing **${Math.round((taskSummary.blocked / taskSummary.total) * 100)}%** of the potential workforce output.
`;
};
