'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Check, X, AlertCircle, MapPin, UserCheck } from 'lucide-react';

interface OrgEmployee { _id: string; fullName: string; email: string; role: string; teamName: string; department: string; team: string; jobRole: string; isApproved: boolean; }
interface OrgGroup { _id: string; fullName: string; email: string; role: string; team: string; groupType: string; reports: OrgEmployee[]; }
interface AvailableManager { _id: string; fullName: string; email: string; role: string; }

const AVATAR_COLORS = ['#f97316','#6366f1','#10b981','#a855f7','#f59e0b','#ef4444'];
function avColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 6; return AVATAR_COLORS[h]; }
function initials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase(); }

export default function TeamHierarchy() {
  const [tree, setTree] = useState<OrgGroup[]>([]);
  const [unassigned, setUnassigned] = useState<OrgEmployee[]>([]);
  const [managers, setManagers] = useState<AvailableManager[]>([]);
  const [groupedByZone, setGroupedByZone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState({ managerId: '', teamName: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [managerFilter, setManagerFilter] = useState('');
  const [userRole, setUserRole] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmp, setNewEmp] = useState({ fullName: '', email: '', password: '' });

  const fetchOrg = () => {
    setLoading(true);
    fetch('/api/org', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.tree) setTree(d.tree);
        if (d.unassigned) setUnassigned(d.unassigned);
        if (d.availableManagers) setManagers(d.availableManagers);
        if (d.groupedByZone !== undefined) setGroupedByZone(d.groupedByZone);
      })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrg(); }, []);
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.role) setUserRole(d.role); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tree.length > 0 || unassigned.length > 0) {
      const exp: Record<string, boolean> = { unassigned: true };
      tree.forEach(g => { exp[g._id] = true; });
      setExpanded(exp);
    }
  }, [tree, unassigned]);

  const flash = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const saveEdit = async (empId: string) => {
    setSaving(true);
    try {
      const r = await fetch('/api/org', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: empId, ...editData, managerId: editData.managerId || null }) });
      const d = await r.json();
      if (d.ok) { flash('Saved!', true); setEditing(null); fetchOrg(); }
      else flash(d.error || 'Failed', false);
    } catch { flash('Error', false); } setSaving(false);
  };

  const addTeamMember = async () => {
    if (!newEmp.fullName.trim() || !newEmp.email.trim() || !newEmp.password) return;
    setAdding(true);
    try {
      const r = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newEmp.fullName.trim(),
          email: newEmp.email.trim().toLowerCase(),
          password: newEmp.password,
          role: 'employee',
        }),
      });
      const d = await r.json();
      if (d.ok) {
        flash('Team member added', true);
        setShowAdd(false);
        setNewEmp({ fullName: '', email: '', password: '' });
        fetchOrg();
      } else {
        flash(d.error || 'Failed to add', false);
      }
    } catch {
      flash('Network error', false);
    }
    setAdding(false);
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  const EmployeeCard = ({ emp }: { emp: OrgEmployee }) => {
    const isEditing = editing === emp._id;
    return (
      <div className="p-3 rounded-2xl transition hover:border-white/15"
        style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: avColor(emp.fullName), color: '#fff' }}>{initials(emp.fullName)}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{emp.fullName}</div>
              <div className="text-[10px] truncate" style={{ color: '#6b7280' }}>{emp.team}</div>
              {!isEditing && (emp.teamName || emp.department) && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {emp.teamName && <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{emp.teamName}</span>}
                  {emp.department && <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>{emp.department}</span>}
                </div>
              )}
            </div>
          </div>
          {!isEditing && userRole !== 'manager' ? (
            <button onClick={() => { setEditing(emp._id); setEditData({ managerId: '', teamName: emp.teamName || '', department: emp.department || '' }); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition flex-shrink-0"
              style={{ color: '#6b7280' }}><Edit2 className="w-3 h-3"/></button>
          ) : isEditing ? (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => saveEdit(emp._id)} disabled={saving}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition disabled:opacity-50"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}><Check className="w-3 h-3"/></button>
              <button onClick={() => setEditing(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:bg-gray-100"
                style={{ color: '#6b7280' }}><X className="w-3 h-3"/></button>
            </div>
          ) : null}
        </div>

        {isEditing && userRole !== 'manager' && (
          <div className="mt-3 pt-3 space-y-2 border-t" style={{ borderColor: '#f3f4f6' }}>
            {managers.length > 0 && (
              <select value={editData.managerId} onChange={e => setEditData(p => ({ ...p, managerId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151' }}>
                <option value="">No Manager</option>
                {managers.map(m => <option key={m._id} value={m._id}>{m.fullName} ({m.role})</option>)}
              </select>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input value={editData.teamName} onChange={e => setEditData(p => ({ ...p, teamName: e.target.value }))} placeholder="Team name"
                className="px-3 py-2 rounded-xl text-xs focus:outline-none text-gray-700 placeholder-gray-400"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}/>
              <input value={editData.department} onChange={e => setEditData(p => ({ ...p, department: e.target.value }))} placeholder="Department"
                className="px-3 py-2 rounded-xl text-xs focus:outline-none text-gray-700 placeholder-gray-400"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}/>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">ARENA OS - Team Hierarchy</h1>
            <div className="text-xs" style={{ color: '#6b7280' }}>
              {groupedByZone ? 'Grouped by zone - assign team & department below' : 'Grouped by manager'}
            </div>
          </div>
          {userRole === 'manager' && (
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: '#f97316', color: '#ffffff' }}
            >
              Add Team Member
            </button>
          )}
        </div>
        {!groupedByZone && managers.length > 0 && userRole !== 'manager' && (
          <div className="mt-3">
            <select
              value={managerFilter}
              onChange={e => setManagerFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs focus:outline-none"
              style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151' }}
            >
              <option value="">All Managers</option>
              {managers.map(m => <option key={m._id} value={m._id}>{m.fullName}</option>)}
            </select>
          </div>
        )}
        {msg && (
          <div className="mt-3 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: msg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: msg.ok ? '#10b981' : '#ef4444' }}>
            {msg.text}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl" style={{ background: '#ffffff' }}/>)}
        </div>
      ) : (
        <>
          {tree
            .filter(group => !managerFilter || group._id === managerFilter || group.reports.some((r: any) => (r as any).managerId === managerFilter))
            .map(group => (
            <div key={group._id} style={card} className="overflow-hidden">
              <button onClick={() => setExpanded(p => ({ ...p, [group._id]: !p[group._id] }))}
                className="w-full flex items-center justify-between p-4 transition hover:bg-gray-50 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: group.groupType === 'zone' ? 'rgba(249,115,22,0.15)' : `${avColor(group.fullName)}20` }}>
                    {group.groupType === 'zone'
                      ? <MapPin className="w-4 h-4" style={{ color: '#f97316' }}/>
                      : <span className="text-xs font-bold" style={{ color: avColor(group.fullName) }}>{initials(group.fullName)}</span>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">{group.fullName}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: group.role === 'admin' ? 'rgba(239,68,68,0.15)' : group.role === 'zone' ? 'rgba(249,115,22,0.15)' : 'rgba(168,85,247,0.15)', color: group.role === 'admin' ? '#ef4444' : group.role === 'zone' ? '#f97316' : '#c084fc' }}>
                        {group.role === 'zone' ? 'Zone' : group.role}
                      </span>
                    </div>
                    <div className="text-[10px]" style={{ color: '#6b7280' }}>{group.reports.length} members</div>
                  </div>
                </div>
                {expanded[group._id] ? <ChevronDown className="w-4 h-4" style={{ color: '#6b7280' }}/> : <ChevronRight className="w-4 h-4" style={{ color: '#6b7280' }}/>}
              </button>
              {expanded[group._id] && (
                <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: '#f9fafb' }}>
                  <div className="pt-3"/>
                  {group.reports.length === 0
                    ? <div className="text-xs text-center py-4" style={{ color: '#9ca3af' }}>No members yet</div>
                    : group.reports.map(emp => <EmployeeCard key={emp._id} emp={emp}/>)}
                </div>
              )}
            </div>
          ))}

          {unassigned.length > 0 && userRole !== 'manager' && (
            <div style={{ ...card, borderColor: 'rgba(249,115,22,0.2)' }} className="overflow-hidden">
              <button onClick={() => setExpanded(p => ({ ...p, unassigned: !p.unassigned }))}
                className="w-full flex items-center justify-between p-4 transition hover:bg-gray-50 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.1)' }}>
                    <AlertCircle className="w-4 h-4" style={{ color: '#f97316' }}/>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Unassigned</div>
                    <div className="text-[10px]" style={{ color: '#f97316' }}>{unassigned.length} without manager</div>
                  </div>
                </div>
                {expanded['unassigned'] ? <ChevronDown className="w-4 h-4" style={{ color: '#6b7280' }}/> : <ChevronRight className="w-4 h-4" style={{ color: '#6b7280' }}/>}
              </button>
              {expanded['unassigned'] && (
                <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: '#f9fafb' }}>
                  <div className="pt-3"/>
                  {unassigned.map(emp => <EmployeeCard key={emp._id} emp={emp}/>)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showAdd && userRole === 'manager' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-3xl border border-gray-200 w-full max-w-md shadow-2xl p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">Add Team Member</h3>
              <button onClick={() => setShowAdd(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Full Name</label>
                <input value={newEmp.fullName} onChange={e => setNewEmp(p => ({ ...p, fullName: e.target.value }))}
                  placeholder="Satvik Sharma" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Email</label>
                <input value={newEmp.email} onChange={e => setNewEmp(p => ({ ...p, email: e.target.value }))}
                  type="email" placeholder="satvik@gharpayy.com" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Password</label>
                <input value={newEmp.password} onChange={e => setNewEmp(p => ({ ...p, password: e.target.value }))}
                  type="password" placeholder="Min 6 characters" required minLength={6}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <button onClick={addTeamMember} disabled={adding}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-2xl transition disabled:opacity-60 mt-2">
                {adding ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



