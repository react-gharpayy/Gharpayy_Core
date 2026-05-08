import { IST_OFFSET_MS } from './constants';

export function getISTDateStr(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];
}
