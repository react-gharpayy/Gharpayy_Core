/**
 * components/hierarchy/avatar.ts
 * Shared avatar color + initials helpers for hierarchy components.
 */

const AVATAR_COLORS = ['#f97316', '#6366f1', '#10b981', '#a855f7', '#f59e0b', '#ef4444'];

export function avColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}
