/**
 * modules/coach-ai/lib/engines/hub-engine.ts
 */

export const analyzeHubs = (data: any) => {
  const { teamPulse } = data;
  
  const hubMap: Record<string, { total: number; present: number }> = {};
  teamPulse.forEach((p: any) => {
    if (!hubMap[p.team]) hubMap[p.team] = { total: 0, present: 0 };
    hubMap[p.team].total++;
    if (p.workMode !== 'Absent') hubMap[p.team].present++;
  });

  const hubStats = Object.entries(hubMap).map(([name, stats]) => ({
    name,
    rate: Math.round((stats.present / stats.total) * 100)
  })).sort((a, b) => b.rate - a.rate);

  return `
# HUB COMPARATIVE DIAGNOSTIC

Cross-hub analysis reveals significant variance in regional execution health.

## Hub Performance Rankings
${hubStats.map(h => `- **${h.name}**: ${h.rate}% Attendance ${h.rate > 90 ? '✅' : h.rate < 75 ? '⚠️' : '➖'}`).join('\n')}

**Strategic Analysis:**
The **${hubStats[0].name}** Hub is currently setting the organizational benchmark. Conversely, the **${hubStats[hubStats.length - 1].name}** Hub requires immediate management intervention to address a **${hubStats[0].rate - hubStats[hubStats.length - 1].rate}%** performance gap.
`;
};
