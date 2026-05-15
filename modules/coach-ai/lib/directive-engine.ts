/**
 * modules/coach-ai/lib/directive-engine.ts
 * 
 * Generates TACTICAL OPERATIONAL DIRECTIVES.
 * Functions as an execution commander, not a reporting tool.
 */

import { OperationalOntology } from './context-engine';
import { OPERATIONAL_PLAYBOOKS } from './playbooks';

export const generateDirectives = (context: OperationalOntology, lastResponse: string): string => {
  const { hubs, metrics, anomalies } = context;
  
  const atRiskHubs = Object.values(hubs).filter(h => h.status === 'at-risk' || h.status === 'critical');
  
  let content = "# TACTICAL EXECUTION DIRECTIVES\n\n";

  if (atRiskHubs.length > 0) {
    const hubNames = atRiskHubs.map(h => h.name).join(', ');
    content += `
## HUB STABILIZATION: ${hubNames}
- **Assign Recovery Owner**: Immediate oversight required for **${hubNames}**. Hub Managers must submit a 24-hour stabilization plan by end-of-day.
- **Accountability Action**: All operators with <85% punctuality must complete a mandatory morning diagnostic sync for the next 72 hours.
- **Root Cause Analysis**: Audit commute variance for the bottom 10% of punctuality laggards in these zones.
- **Playbook Active**: [${OPERATIONAL_PLAYBOOKS.ATTENDANCE_RECOVERY.name}]
`;
  }

  if (metrics.taskCompletionRate < 80) {
    content += `
## VELOCITY RECOVERY
- **Direct Action**: Redistribute **${anomalies.filter(a => a.includes('overdue')).length} overdue tasks** to the organization's A-Players today.
- **Blocker Resolution**: Immediate 30-minute 'Clear Path' session for all operators with **Blocked** status.
- **Execution Target**: Target **+10% Task Velocity** by the 4 PM shift review.
- **Playbook Active**: [${OPERATIONAL_PLAYBOOKS.VELOCITY_STABILIZATION.name}]
`;
  }

  if (content === "# TACTICAL EXECUTION DIRECTIVES\n\n") {
    content += `
## OPERATIONAL CADENCE
- **Maintain Discipline**: Org metrics are currently within optimal variance. 
- **Forward Directive**: Conduct a preemptive audit of next week's shift coverage to ensure 100% redundancy.
- **Recognition**: Publicly acknowledge the top-performing Hub Manager for maintaining a **${metrics.attendanceRate}%** attendance rate.
`;
  }

  return content;
};
