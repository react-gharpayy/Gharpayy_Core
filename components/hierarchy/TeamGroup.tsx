'use client';
/**
 * components/hierarchy/TeamGroup.tsx
 *
 * Collapsible group header for a manager or zone node.
 * Shows: avatar, name, role badge, member count, expand/collapse.
 * Renders its children (HierarchyNode list) when expanded.
 */

import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import RoleBadge from './RoleBadge';
import { avColor, initials } from './avatar';
import type { HierarchyGroup } from './types';

interface TeamGroupProps {
  group: HierarchyGroup;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function TeamGroup({ group, isExpanded, onToggle, children }: TeamGroupProps) {
  const isZone = group.groupType === 'zone';
  const color  = avColor(group.fullName);
  const ini    = initials(group.fullName);

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      {/* ── Header button ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 transition hover:bg-gray-50 text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {/* Avatar / zone icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isZone ? 'rgba(249,115,22,0.12)' : `${color}20` }}
          >
            {isZone
              ? <MapPin className="w-4 h-4" style={{ color: '#f97316' }} />
              : <span className="text-xs font-bold" style={{ color }}>{ini}</span>
            }
          </div>

          {/* Name + badge + count */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 text-sm truncate">{group.fullName}</span>
              <RoleBadge hierarchyRole={group.hierarchyRole} role={group.role} />
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>
              {group.reports.length} member{group.reports.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Chevron */}
        {isExpanded
          ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#9ca3af' }} />
          : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#9ca3af' }} />
        }
      </button>

      {/* ── Expanded content ── */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: '#f9fafb' }}>
          <div className="pt-3" />
          {group.reports.length === 0
            ? <div className="text-xs text-center py-4 text-gray-400">No members yet</div>
            : children
          }
        </div>
      )}
    </div>
  );
}
