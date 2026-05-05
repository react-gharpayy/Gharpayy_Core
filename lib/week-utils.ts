import { IST_OFFSET_MS } from '@/lib/constants';

const DAY_MS = 24 * 60 * 60 * 1000;

function toIST(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

function toDateStr(date: Date) {
  return toIST(date).toISOString().split('T')[0];
}

function getISTDayOfWeek(date: Date) {
  return toIST(date).getUTCDay(); // 0=Sun, 1=Mon
}

export function getFirstMonday(year: number) {
  let d = new Date(Date.UTC(year, 0, 1));
  while (getISTDayOfWeek(d) !== 1) {
    d = new Date(d.getTime() + DAY_MS);
  }
  return d;
}

export function getWeekRange(year: number, weekNumber: number) {
  const firstMonday = getFirstMonday(year);
  const safeWeek = Math.min(44, Math.max(1, weekNumber));
  const start = new Date(firstMonday.getTime() + (safeWeek - 1) * 7 * DAY_MS);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return {
    year,
    weekNumber: safeWeek,
    startDate: toDateStr(start),
    endDate: toDateStr(end),
  };
}

export function listWeeks(year: number) {
  const weeks = [];
  for (let i = 1; i <= 44; i += 1) {
    weeks.push(getWeekRange(year, i));
  }
  return weeks;
}

export function getCurrentWeekNumber(date = new Date()) {
  const year = toIST(date).getUTCFullYear();
  const firstMonday = getFirstMonday(year);
  const diffDays = Math.floor((toIST(date).getTime() - toIST(firstMonday).getTime()) / DAY_MS);
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(44, Math.max(1, week));
}

export function getCurrentWeekInfo(date = new Date()) {
  const year = toIST(date).getUTCFullYear();
  const weekNumber = getCurrentWeekNumber(date);
  const range = getWeekRange(year, weekNumber);
  return range;
}

