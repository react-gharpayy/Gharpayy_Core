/**
 * modules/coach-ai/lib/engines/intervention-engine.ts
 */

import { OPERATIONAL_PLAYBOOKS } from '../playbooks';

export const generateInterventionPlan = (data: any) => {
  const { teamPulse, taskSummary } = data;
  
  // Identify bottom performers (simplified for mock/live transition)
  const atRiskOperators = teamPulse
    .filter((p: any) => p.workMode === 'Absent' || p.dayStatus === 'Late')
    .slice(0, 3);

  return `
# OPERATIONAL INTERVENTION PLAN

### Diagnostic: Underperforming Operators
The following operators have triggered behavioral correction protocols:
${atRiskOperators.map((p: any) => `- **${p.employeeName}**: Consistency regression detected.`).join('\n')}

### Intervention Actions (Playbook: ${OPERATIONAL_PLAYBOOKS.COACHING_INTERVENTION.name})
1. **Root Cause Analysis**: Conduct diagnostic 1:1 sessions to determine if bottlenecks are commute-related or process-driven.
2. **Accountability Target**: Operators must achieve **95% punctuality** over the next 5 business days.
3. **Corrective Directives**: Assign these operators to "High-Density" morning task queues to enforce early momentum.
`;
};
