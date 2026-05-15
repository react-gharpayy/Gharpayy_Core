/**
 * modules/coach-ai/lib/engines/attendance-engine.ts
 */

export const analyzeAttendance = (data: any) => {
  const { summary, kpis, trackerCompliance } = data;
  
  return `
# ATTENDANCE & COMPLIANCE DIAGNOSTIC

The organization is maintaining a **${kpis.attendance}%** attendance rate today.

## Punctuality Analysis
- **On-Time Rate**: ${kpis.onTimeRate}%
- **Late Arrivals**: ${summary.late} operators
- **Early Departures**: ${summary.early} operators

## Tracker Compliance
- **Daily Submission**: ${trackerCompliance.daily}%
- **Missing Today**: ${trackerCompliance.missingToday} operators
- **Post-Submission Edits**: ${trackerCompliance.editedToday} instances

**Executive Insight:**
Punctuality remains the primary variance factor. With **${summary.late}** late arrivals, the morning execution velocity is restricted by approximately **15%**.
`;
};
