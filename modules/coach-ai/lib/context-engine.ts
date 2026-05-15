/**
 * modules/coach-ai/lib/context-engine.ts
 * 
 * Defines the Gharpayy Operational Ontology and transforms raw data 
 * into a structured context for constrained AI reasoning.
 */

export interface OperationalOntology {
  hubs: Record<string, HubContext>;
  teams: Record<string, TeamContext>;
  roles: {
    leadership: number;
    managers: number;
    recruiters: number;
    operators: number;
  };
  metrics: {
    orgHealthScore: number;
    attendanceRate: number;
    taskCompletionRate: number;
    onTimeRate: number;
  };
  anomalies: string[];
}

export interface HubContext {
  name: string;
  attendanceRate: number;
  activeOperators: number;
  totalOperators: number;
  status: 'optimal' | 'stable' | 'at-risk' | 'critical';
}

export interface TeamContext {
  name: string;
  managerName: string;
  memberCount: number;
  attendanceRate: number;
  taskVelocity: number;
  status: 'optimal' | 'stable' | 'at-risk' | 'critical';
}

/**
 * Transforms raw command-center data into structured operational context.
 * This ensures the AI uses consistent terminology and avoids hallucinations.
 */
export const buildOperationalContext = (rawData: any): OperationalOntology => {
  const { teamPulse, kpis, healthScore, taskSummary, needAction, summary } = rawData;

  const context: OperationalOntology = {
    hubs: {},
    teams: {},
    roles: {
      leadership: 0,
      managers: 0,
      recruiters: 0,
      operators: 0
    },
    metrics: {
      orgHealthScore: healthScore,
      attendanceRate: kpis.attendance,
      taskCompletionRate: kpis.taskCompletion,
      onTimeRate: kpis.onTimeRate
    },
    anomalies: needAction.map((a: any) => a.label)
  };

  // Group by "Hubs" (mapped from Zones in current data structure)
  // Group by "Teams" (if available, fallback to general groups)
  teamPulse.forEach((pulse: any) => {
    const hubName = pulse.team || 'Unassigned Hub'; // Currently API uses zone as team
    
    if (!context.hubs[hubName]) {
      context.hubs[hubName] = {
        name: hubName,
        attendanceRate: 0,
        activeOperators: 0,
        totalOperators: 0,
        status: 'stable'
      };
    }

    context.hubs[hubName].totalOperators++;
    if (pulse.workMode !== 'Absent') {
      context.hubs[hubName].activeOperators++;
    }

    // Role detection (simplified mapping for current data)
    // In a full implementation, we'd check User.role and User.playbookRole
    context.roles.operators++;
  });

  // Post-process Hubs
  Object.values(context.hubs).forEach(hub => {
    hub.attendanceRate = Math.round((hub.activeOperators / hub.totalOperators) * 100);
    if (hub.attendanceRate > 90) hub.status = 'optimal';
    else if (hub.attendanceRate < 70) hub.status = 'critical';
    else if (hub.attendanceRate < 85) hub.status = 'at-risk';
  });

  return context;
};

/**
 * Deterministic summary generator.
 * Creates a hard-fact briefing that the AI can then interpret.
 */
export const generateDeterministicBriefing = (context: OperationalOntology): string => {
  const hubReports = Object.values(context.hubs)
    .map(h => `- **${h.name} Hub**: ${h.attendanceRate}% Attendance (${h.activeOperators}/${h.totalOperators} Active). Status: ${h.status.toUpperCase()}.`)
    .join('\n');

  return `
# DETERMINISTIC OPERATIONAL SUMMARY

## Core Metrics
- **Organization Health Score**: ${context.metrics.orgHealthScore}/100
- **Total Attendance**: ${context.metrics.attendanceRate}%
- **Task Velocity**: ${context.metrics.taskCompletionRate}%
- **Punctuality**: ${context.metrics.onTimeRate}%

## Hub Status
${hubReports}

## Execution Anomalies
${context.anomalies.length > 0 ? context.anomalies.map(a => `- ${a}`).join('\n') : '- No critical anomalies detected.'}
`;
};
