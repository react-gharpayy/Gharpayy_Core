/**
 * Gharpayy Quest Definitions
 * Centralized configuration for daily and weekly missions.
 */

export type QuestKind = 'daily' | 'weekly';

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  kind: QuestKind;
  target: number;
  metric: string;
  xpAward: number;
  coinAward: number;
}

export const DAILY_QUESTS: QuestDefinition[] = [
  {
    id: 'd-ontime-checkin',
    title: 'Zero Latency Start',
    description: 'Punch in on time today.',
    kind: 'daily',
    target: 1,
    metric: 'ontime_checkin',
    xpAward: 50,
    coinAward: 20
  },
  {
    id: 'd-tasks-3',
    title: 'Task Velocity',
    description: 'Complete 3 tasks today.',
    kind: 'daily',
    target: 3,
    metric: 'tasks_closed',
    xpAward: 80,
    coinAward: 40
  },
  {
    id: 'd-tracker-eod',
    title: 'EOD Discipline',
    description: 'Submit your daily tracker by 8 PM.',
    kind: 'daily',
    target: 1,
    metric: 'eod_submitted',
    xpAward: 60,
    coinAward: 30
  },
  {
    id: 'd-kudo-give',
    title: 'Team Lift',
    description: 'Give a kudos to a teammate today.',
    kind: 'daily',
    target: 1,
    metric: 'kudo_given',
    xpAward: 30,
    coinAward: 15
  }
];

export const WEEKLY_QUESTS: QuestDefinition[] = [
  {
    id: 'w-ontime-5days',
    title: 'Attendance Streak',
    description: 'Punch in on time 5 days this week.',
    kind: 'weekly',
    target: 5,
    metric: 'ontime_checkin',
    xpAward: 300,
    coinAward: 150
  },
  {
    id: 'w-tasks-10',
    title: 'Velocity Week',
    description: 'Complete 10 tasks this week.',
    kind: 'weekly',
    target: 10,
    metric: 'tasks_closed',
    xpAward: 400,
    coinAward: 200
  },
  {
    id: 'w-coaching-done',
    title: '1:1 Champion',
    description: 'Complete a coaching session this week.',
    kind: 'weekly',
    target: 1,
    metric: 'coaching_done',
    xpAward: 200,
    coinAward: 100
  }
];

export const ALL_QUESTS = [...DAILY_QUESTS, ...WEEKLY_QUESTS];

export const XP_EVENTS = {
  PERFECT_ATTENDANCE: 50,
  TASK_CLOSED: 20,
  TASK_CLOSED_EARLY: 50,
  KUDO_GIVEN: 10,
  KUDO_RECEIVED: 25,
  EOD_REPORT_SHIPPED: 20,
  ONE_ON_ONE_DONE: 50,
  LOGIN_STREAK_DAY: 20,
} as const;

export type XPEventKey = keyof typeof XP_EVENTS;
