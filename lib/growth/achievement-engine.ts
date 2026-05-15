/**
 * Gharpayy Achievement Engine
 * Derived achievements computed dynamically from user performance data.
 */

export type AchievementLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  level: AchievementLevel;
  earned: boolean;
  progress: number; // 0-100
  metricValue: number;
  metricTarget: number;
}

export interface UserStats {
  xp: number;
  level: number;
  streakDays: number;
  tasksCompleted: number;
  kudosReceived: number;
  attendanceDays: number;
}

export function computeAchievements(stats: UserStats): Achievement[] {
  const achievements: Achievement[] = [
    // --- XP Milestones ---
    {
      id: 'xp-rookie',
      title: 'Rising Star',
      description: 'Reach Level 5',
      level: 'bronze',
      earned: stats.level >= 5,
      progress: Math.min(100, Math.round((stats.level / 5) * 100)),
      metricValue: stats.level,
      metricTarget: 5
    },
    {
      id: 'xp-expert',
      title: 'Arena Veteran',
      description: 'Reach Level 25',
      level: 'gold',
      earned: stats.level >= 25,
      progress: Math.min(100, Math.round((stats.level / 25) * 100)),
      metricValue: stats.level,
      metricTarget: 25
    },

    // --- Streak Milestones ---
    {
      id: 'streak-week',
      title: 'Consistency King',
      description: 'Maintain a 7-day streak',
      level: 'silver',
      earned: stats.streakDays >= 7,
      progress: Math.min(100, Math.round((stats.streakDays / 7) * 100)),
      metricValue: stats.streakDays,
      metricTarget: 7
    },
    {
      id: 'streak-fire',
      title: 'On Fire',
      description: 'Maintain a 30-day streak',
      level: 'platinum',
      earned: stats.streakDays >= 30,
      progress: Math.min(100, Math.round((stats.streakDays / 30) * 100)),
      metricValue: stats.streakDays,
      metricTarget: 30
    },

    // --- Task Milestones ---
    {
      id: 'tasks-starter',
      title: 'Task Finisher',
      description: 'Complete 10 tasks',
      level: 'bronze',
      earned: stats.tasksCompleted >= 10,
      progress: Math.min(100, Math.round((stats.tasksCompleted / 10) * 100)),
      metricValue: stats.tasksCompleted,
      metricTarget: 10
    },
    {
      id: 'tasks-elite',
      title: 'Execution Machine',
      description: 'Complete 100 tasks',
      level: 'gold',
      earned: stats.tasksCompleted >= 100,
      progress: Math.min(100, Math.round((stats.tasksCompleted / 100) * 100)),
      metricValue: stats.tasksCompleted,
      metricTarget: 100
    },

    // --- Kudos Milestones ---
    {
      id: 'kudos-loved',
      title: 'Crowd Favorite',
      description: 'Receive 5 kudos',
      level: 'silver',
      earned: stats.kudosReceived >= 5,
      progress: Math.min(100, Math.round((stats.kudosReceived / 5) * 100)),
      metricValue: stats.kudosReceived,
      metricTarget: 5
    }
  ];

  return achievements;
}
