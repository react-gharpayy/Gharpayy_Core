/**
 * Gharpayy XP Engine
 * Pure utilities for gamification math.
 */

export const LEVEL_BASE_XP = 100;
export const XP_MULTIPLIER_PER_LEVEL = 1.2;

/**
 * Quadratic-ish level curve:
 * level 1: 0 XP
 * level 2: 100 XP
 * level 3: 300 XP (100 + 200)
 * level 4: 600 XP (100 + 200 + 300)
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += i * LEVEL_BASE_XP;
  }
  return total;
}

export function calculateLevelFromXP(xp: number): number {
  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) {
    level++;
  }
  return level;
}

export function calculateLevelProgress(xp: number) {
  const level = calculateLevelFromXP(xp);
  const currentLevelXP = xpRequiredForLevel(level);
  const nextLevelXP = xpRequiredForLevel(level + 1);
  const xpInLevel = xp - currentLevelXP;
  const xpNeededForNext = nextLevelXP - currentLevelXP;
  const progressPercentage = Math.min(100, Math.round((xpInLevel / xpNeededForNext) * 100));

  return {
    level,
    xpInLevel,
    xpNeededForNext,
    progressPercentage,
    xpToNext: nextLevelXP - xp
  };
}

export function calculateStreakBonus(currentStreak: number): number {
  // Bonus starts after 3 days, capped at 10 days
  if (currentStreak < 3) return 0;
  const effectiveStreak = Math.min(currentStreak, 10);
  return (effectiveStreak - 2) * 5; // +5 XP per day of streak beyond day 2
}

export function calculateComboMultiplier(eventCountInPeriod: number): number {
  // Multiplier for rapid activity
  if (eventCountInPeriod < 3) return 1;
  if (eventCountInPeriod < 5) return 1.1;
  if (eventCountInPeriod < 10) return 1.2;
  return 1.5;
}

/**
 * Returns the final XP to be awarded after applying bonuses and multipliers.
 */
export function calculateAwardedXP(baseAmount: number, streakDays: number, comboCount: number = 0): number {
  const streakBonus = calculateStreakBonus(streakDays);
  const comboMultiplier = calculateComboMultiplier(comboCount);
  return Math.round((baseAmount + streakBonus) * comboMultiplier);
}
