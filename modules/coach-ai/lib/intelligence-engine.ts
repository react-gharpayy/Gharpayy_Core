/**
 * modules/coach-ai/lib/intelligence-engine.ts
 * 
 * Gharpayy Multi-Engine Intelligence Orchestrator.
 * Routes queries to specialized operational analysis engines.
 */

import { buildOperationalContext, OperationalOntology } from './context-engine';
import { generateDirectives } from './directive-engine';
import { getSuggestedFollowUps } from './followup-engine';

// Specialized Execution Engines
import { analyzeAttendance } from './engines/attendance-engine';
import { analyzePerformance } from './engines/performance-engine';
import { analyzeHubs } from './engines/hub-engine';
import { generateInterventionPlan } from './engines/intervention-engine';
import { analyzeEscalationTriggers } from './engines/escalation-engine';

export interface InsightResult {
  content: string;
  followUps: string[];
  context: OperationalOntology;
}

/**
 * Tactical Intent Classifier
 */
const detectIntent = (query: string): 'attendance' | 'performance' | 'hubs' | 'directives' | 'intervention' | 'escalation' | 'general' => {
  const q = query.toLowerCase();
  if (q.includes('directive') || q.includes('action') || q.includes('step') || q.includes('playbook')) return 'directives';
  if (q.includes('intervention') || q.includes('coach') || q.includes('correction') || q.includes('underperform')) return 'intervention';
  if (q.includes('escalate') || q.includes('emergency') || q.includes('trigger')) return 'escalation';
  if (q.includes('attendance') || q.includes('punctuality') || q.includes('on-time') || q.includes('late')) return 'attendance';
  if (q.includes('performer') || q.includes('operator') || q.includes('velocity') || q.includes('task') || q.includes('a-player')) return 'performance';
  if (q.includes('hub') || q.includes('zone') || q.includes('compare') || q.includes('comparison')) return 'hubs';
  return 'general';
};

/**
 * The Orchestration Layer.
 */
export const generateGharpayyInsight = (rawData: any, query: string, isDirectiveRequest: boolean = false): InsightResult => {
  const context = buildOperationalContext(rawData);
  const intent = isDirectiveRequest ? 'directives' : detectIntent(query);
  
  let content = "";

  switch (intent) {
    case 'directives':
      content = generateDirectives(context, query);
      break;
    case 'intervention':
      content = generateInterventionPlan(rawData);
      break;
    case 'escalation':
      content = analyzeEscalationTriggers(rawData);
      break;
    case 'attendance':
      content = analyzeAttendance(rawData);
      break;
    case 'performance':
      content = analyzePerformance(rawData);
      break;
    case 'hubs':
      content = analyzeHubs(rawData);
      break;
    case 'general':
    default:
      const hubReports = Object.values(context.hubs)
        .map(h => `- **${h.name}**: ${h.attendanceRate}%`).join('\n');
      
      content = `
# OPERATIONAL COMMAND BRIEFING

- **Org Health Score**: ${context.metrics.orgHealthScore}/100
- **Total Attendance**: ${context.metrics.attendanceRate}%
- **Task Velocity**: ${context.metrics.taskCompletionRate}%

## Regional Execution Status
${hubReports}

**Command Insight:**
Execution momentum is **${context.metrics.orgHealthScore > 80 ? 'Optimal' : 'Sub-optimal'}**. Recommended focus: resolving **${context.anomalies.length}** execution anomalies via the [Directives] engine.
`;
      break;
  }

  return {
    content,
    followUps: getSuggestedFollowUps(context, query),
    context
  };
};
