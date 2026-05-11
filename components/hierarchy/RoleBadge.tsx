'use client';
/**
 * components/hierarchy/RoleBadge.tsx
 *
 * Displays a colored role badge for any hierarchy role.
 * Works with both legacy roles (admin/manager/employee) and
 * new configurable hierarchy roles.
 */

interface RoleBadgeProps {
  /** Custom hierarchy role name + color (takes priority) */
  hierarchyRole?: { name: string; color: string } | null;
  /** Legacy role string fallback */
  role?: string;
  size?: 'xs' | 'sm';
}

/** Fallback colors for legacy roles without a hierarchy role assigned */
const LEGACY_COLORS: Record<string, { bg: string; text: string }> = {
  admin:     { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
  manager:   { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  team_lead: { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa' },
  hr:        { bg: 'rgba(52,211,153,0.12)',  text: '#34d399' },
  employee:  { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
  zone:      { bg: 'rgba(249,115,22,0.12)',  text: '#f97316' },
};

function legacyStyle(role: string) {
  return LEGACY_COLORS[role?.toLowerCase()] ?? { bg: 'rgba(107,114,128,0.12)', text: '#6b7280' };
}

export default function RoleBadge({ hierarchyRole, role, size = 'xs' }: RoleBadgeProps) {
  const textSize = size === 'xs' ? 'text-[9px]' : 'text-[11px]';
  const padding  = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2.5 py-1';

  if (hierarchyRole) {
    return (
      <span
        className={`${textSize} ${padding} rounded-full font-semibold`}
        style={{ background: `${hierarchyRole.color}20`, color: hierarchyRole.color }}
      >
        {hierarchyRole.name}
      </span>
    );
  }

  if (role) {
    const { bg, text } = legacyStyle(role);
    return (
      <span
        className={`${textSize} ${padding} rounded-full font-semibold`}
        style={{ background: bg, color: text }}
      >
        {role}
      </span>
    );
  }

  return null;
}
