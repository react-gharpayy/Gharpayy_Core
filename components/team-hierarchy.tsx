'use client';
// ─── Phase 1-4 upgrade: modular hierarchy tree ───────────────────────────────
// Sub-components live in components/hierarchy/
// This file is now a thin orchestrator: data fetching + state + layout only.
import { useEffect, useState, useCallback } from 'react';
import { GitBranch, Plus, RefreshCw, Check, AlertCircle } from 'lucide-react';

import HierarchyTree from './hierarchy/HierarchyTree';
import AssignModal from './hierarchy/AssignModal';
import AddMemberModal from './hierarchy/AddMemberModal';
import RoleBadge from './hierarchy/RoleBadge';
import type {
  OrgApiResponse,
  HierarchyGroup,
  HierarchyMember,
  AvailableManager,
  HierarchyRoleDef,
} from './hierarchy/types';

export default function TeamHierarchy() {
  const [tree, setTree]             = useState<HierarchyGroup[]>([]);
  const [unassigned, setUnassigned] = useState<HierarchyMember[]>([]);
  const [managers, setManagers]     = useState<AvailableManager[]>([]);
  const [hierarchyRoles, setHierarchyRoles] = useState<HierarchyRoleDef[]>([]);
  const [groupedByZone, setGroupedByZone]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [userRole, setUserRole] = useState('');
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  // Modal state
  const [showAdd,    setShowAdd]    = useState(false);
  const [assignTarget, setAssignTarget] = useState<HierarchyMember | null>(null);

  // Manager filter (admin only)
  const [managerFilter, setManagerFilter] = useState('');

  const flash = useCallback((text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  }, []);

  const fetchOrg = useCallback(() => {
    setLoading(true);
    fetch('/api/org', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: OrgApiResponse) => {
        if (d.tree)             setTree(d.tree);
        if (d.unassigned)       setUnassigned(d.unassigned);
        if (d.availableManagers) setManagers(d.availableManagers);
        if (d.groupedByZone !== undefined) setGroupedByZone(d.groupedByZone);
      })
      .catch(() => flash('Failed to load hierarchy', false))
      .finally(() => setLoading(false));
  }, [flash]);

  // Fetch hierarchy role definitions (for AssignModal)
  const fetchHierarchyRoles = useCallback(() => {
    fetch('/api/hierarchy/roles')
      .then(r => r.json())
      .then(d => { if (d.roles) setHierarchyRoles(d.roles); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchOrg();
    fetchHierarchyRoles();
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d?.role) setUserRole(d.role); })
      .catch(() => {});
  }, [fetchOrg, fetchHierarchyRoles]);

  // Filtered tree for manager filter dropdown
  const filteredTree = managerFilter
    ? tree.filter(g => g._id === managerFilter)
    : tree;

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.1)' }}>
              <GitBranch className="w-4 h-4" style={{ color: '#6366f1' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Team Hierarchy</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {loading ? 'Loading…' :
                  tree.length === 0 && unassigned.length > 0
                    ? `${unassigned.length} employee${unassigned.length !== 1 ? 's' : ''} need hierarchy assignment`
                    : groupedByZone
                      ? 'Grouped by zone — assign managers to build the tree'
                      : `${tree.length} group${tree.length !== 1 ? 's' : ''} · ${unassigned.length} unassigned`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrg}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {userRole === 'admin' && unassigned.length > 0 && (
              <button
                onClick={() => setAssignTarget(unassigned[0])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition"
                style={{ background: '#6366f1' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Build Hierarchy
              </button>
            )}
            {userRole === 'manager' && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition"
                style={{ background: '#f97316' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Member
              </button>
            )}
          </div>
        </div>

        {/* Manager filter — admin only */}
        {!groupedByZone && managers.length > 1 && userRole === 'admin' && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Filter:</span>
            <select
              value={managerFilter}
              onChange={e => setManagerFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs focus:outline-none"
              style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151' }}
            >
              <option value="">All Managers</option>
              {managers.map(m => (
                <option key={m._id} value={m._id}>{m.fullName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Role legend */}
        {hierarchyRoles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hierarchyRoles.map(r => (
              <RoleBadge key={r._id} hierarchyRole={{ name: r.name, color: r.color }} size="sm" />
            ))}
          </div>
        )}

        {/* Flash message */}
        {msg && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{
              background: msg.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              color: msg.ok ? '#10b981' : '#ef4444',
            }}
          >
            {msg.ok
              ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            {msg.text}
          </div>
        )}
      </div>

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100" />
          ))}
        </div>
      ) : (
        /* ── Hierarchy tree ── */
        <HierarchyTree
          tree={filteredTree}
          unassigned={unassigned}
          availableManagers={managers}
          userRole={userRole}
          onSaved={(m) => { flash(m, true); fetchOrg(); }}
          onError={(m) => flash(m, false)}
          onAssign={userRole === 'admin' ? (member) => setAssignTarget(member) : undefined}
        />
      )}

      {/* ── Add member modal (manager flow) ── */}
      {showAdd && (
        <AddMemberModal
          onClose={() => setShowAdd(false)}
          onAdded={(m) => { flash(m, true); fetchOrg(); }}
          onError={(m) => flash(m, false)}
        />
      )}

      {/* ── Assign hierarchy role modal (admin flow) ── */}
      {assignTarget && (
        <AssignModal
          member={assignTarget}
          hierarchyRoles={hierarchyRoles}
          availableManagers={managers}
          onClose={() => setAssignTarget(null)}
          onSaved={(m) => { flash(m, true); setAssignTarget(null); fetchOrg(); }}
          onError={(m) => flash(m, false)}
        />
      )}
    </div>
  );
}



