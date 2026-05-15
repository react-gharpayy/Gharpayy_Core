import { IST_OFFSET_MS } from './constants';

export function getISTDateStr(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];
}

export function getISTWeekKey(date = new Date()) {
  const d = new Date(date.getTime() + IST_OFFSET_MS);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}
