/**
 * modules/coach-ai/lib/playbooks.ts
 * 
 * Structured operational playbooks for Gharpayy execution.
 * These define the "Standard Operating Procedures" for intelligence reasoning.
 */

export const OPERATIONAL_PLAYBOOKS = {
  ATTENDANCE_RECOVERY: {
    name: "Attendance Stabilization Protocol",
    triggers: { attendance_below: 85, lateness_above: 15 },
    actions: [
      "Assign Zone Manager to floor-level morning syncs.",
      "Mandatory 5-minute pre-shift briefing for all operators with <90% punctuality.",
      "72-hour observation window with real-time punch-in reporting."
    ]
  },
  VELOCITY_STABILIZATION: {
    name: "Execution Velocity Playbook",
    triggers: { task_completion_below: 75, blocked_tasks_above: 10 },
    actions: [
      "Immediate blocker clearing session with Engineering/Ops leads.",
      "Redistribute low-priority tasks to top 10% performers to clear backlog.",
      "Daily 4 PM 'Blocker Audit' for the next 5 business days."
    ]
  },
  COACHING_INTERVENTION: {
    name: "Behavioral Correction Framework",
    triggers: { performance_score_below: 70 },
    actions: [
      "Diagnostic 1:1 to identify behavioral vs skill-based bottlenecks.",
      "Shadowing session with an A-player in the same hub.",
      "Performance improvement target: +15% velocity within 7 days."
    ]
  }
};
