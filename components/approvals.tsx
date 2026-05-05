'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, MapPin, User } from 'lucide-react';
import { SHIFT_TEMPLATES, SHIFT_TYPE_LABELS, WEEK_DAYS, ShiftType, BreakItem } from '@/lib/shift-templates';

interface Exception {
  _id: string; employeeName: string; type: string;
  date: string; reason: string; requestedTime: string | null;
  status: string; createdAt: string;
  source?: 'exception' | 'employee';
  employeeId?: string;
}

type ScheduleDraft = {
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  breaks: BreakItem[];
  weekOffs: string[];
};

const TYPE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  missed_punch:  { label: 'Missed Punch',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  break_overrun: { label: 'Break Overrun', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  manual_entry:  { label: 'Manual Entry',  color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  geo_failure:   { label: 'Geo Failure',   color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  early_exit:    { label: 'Early Exit',    color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  account_approval: { label: 'Account Approval', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
};

const AVATAR_COLORS = ['#f97316','#6366f1','#10b981','#a855f7','#f59e0b','#ef4444'];
function avColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 6; return AVATAR_COLORS[h]; }
function initials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase(); }
function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`; if (m > 0) return `${m}m ago`; return 'Just now';
}

export default function Approvals() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [employees, setEmployees] = useState<any[]>([]);
  const [corr, setCorr] = useState({ employeeId: '', date: '', clockIn: '10:00', clockOut: '19:00', reason: '' });
  const [corrSaving, setCorrSaving] = useState(false);
  const [pwdRequests, setPwdRequests] = useState<any[]>([]);
  const [pwdActing, setPwdActing] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('');
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleDraft>>({});
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveActing, setLeaveActing] = useState<string | null>(null);

  const templateToDraft = (shiftType: ShiftType): ScheduleDraft => {
    if (shiftType !== 'CUSTOM') {
      const t = SHIFT_TEMPLATES[shiftType];
      return { shiftType, startTime: t.workStart, endTime: t.workEnd, breaks: t.breaks, weekOffs: t.weekOffs };
    }
    return { shiftType: 'CUSTOM', startTime: '10:00', endTime: '19:00', breaks: [], weekOffs: SHIFT_TEMPLATES.FT_MAIN.weekOffs };
  };

  const ensureDraft = (employeeId?: string) => {
    if (!employeeId) return templateToDraft('FT_MAIN');
    const existing = scheduleMap[employeeId];
    if (existing) return existing;
    const next = templateToDraft('FT_MAIN');
    setScheduleMap(p => ({ ...p, [employeeId]: next }));
    return next;
  };

  const updateDraft = (employeeId: string, patch: Partial<ScheduleDraft>) => {
    setScheduleMap(p => ({
      ...p,
      [employeeId]: { ...ensureDraft(employeeId), ...patch },
    }));
  };

  const fetchData = (status = tab, role = userRole) => {
    setLoading(true);
    const exceptionReq = fetch(`/api/exceptions?status=${status}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
    const employeeReq =
      role === 'manager' || status === 'rejected'
        ? Promise.resolve({ ok: true, employees: [] as any[] })
        : fetch(`/api/employees/approvals?status=${status}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));

    const pwdReq = fetch('/api/admin/password-requests', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
    const leaveReq = fetch('/api/leaves/pending', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));

    Promise.all([exceptionReq, employeeReq, pwdReq, leaveReq])
      .then(([exData, empData, pwdData, leaveData]) => {
        const exceptionRows: Exception[] = Array.isArray(exData?.exceptions)
          ? exData.exceptions.map((e: any) => ({ ...e, source: 'exception' as const }))
          : [];

        const employeeRows: Exception[] = Array.isArray(empData?.employees)
          ? empData.employees.map((e: any) => ({
              _id: `emp-${e._id}`,
              employeeId: e._id,
              employeeName: e.fullName || e.email || 'Employee',
              type: 'account_approval',
              date: e.createdAt ? new Date(e.createdAt).toISOString().slice(0, 10) : '-',
              reason: `${e.email || ''}${e.officeZoneId?.name ? ` | ${e.officeZoneId.name}` : ''}${e.jobRole ? ` | ${e.jobRole}` : ''}`,
              requestedTime: null,
              status: e.isApproved ? 'approved' : 'pending',
              createdAt: e.createdAt || new Date().toISOString(),
              source: 'employee' as const,
            }))
          : [];

        const merged = [...exceptionRows, ...employeeRows].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setExceptions(merged);
        if (Array.isArray(pwdData?.requests)) setPwdRequests(pwdData.requests);
        if (Array.isArray(leaveData?.leaves)) setLeaveRequests(leaveData.leaves);

        if (status === 'pending') {
          const exPending = Number(exData?.pendingCount || 0);
          const empPending = employeeRows.filter(e => e.status === 'pending').length;
          setPendingCount(exPending + empPending);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.role) setUserRole(d.role);
        fetchData(tab, d?.role || userRole);
      })
      .catch(() => { fetchData(); });
  }, []);
  useEffect(() => {
    fetch('/api/employees', { cache: 'no-store' }).then(r => r.json()).then(d => { if (d.users) setEmployees(d.users.filter((u: any) => u.role === 'employee')); }).catch(() => {});
  }, []);

  const act = async (id: string, status: 'approved' | 'rejected') => {
    setActing(id);
    try {
      if (id.startsWith('emp-')) {
        const employeeId = id.replace('emp-', '');
        const action = status === 'approved' ? 'approve' : 'reject';
        const schedule = scheduleMap[employeeId] || templateToDraft('FT_MAIN');
        await fetch('/api/employees/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, action, schedule }),
        });
      } else {
        await fetch('/api/exceptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exceptionId: id, status }),
        });
      }
      fetchData(tab);
    } catch {} setActing(null);
  };

  const switchTab = (t: 'pending' | 'approved' | 'rejected') => { setTab(t); fetchData(t); };
  const saveCorrection = async () => {
    if (!corr.employeeId || !corr.date || !corr.clockIn || !corr.clockOut) return;
    setCorrSaving(true);
    try {
      await fetch('/api/attendance/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corr),
      });
      fetchData(tab);
    } catch {}
    setCorrSaving(false);
  };

  const actPwd = async (id: string, action: 'approve' | 'reject') => {
    setPwdActing(id);
    try {
      await fetch(`/api/admin/password-requests/${id}/${action}`, { method: 'POST' });
      fetchData(tab);
    } catch {}
    setPwdActing(null);
  };

  const actLeave = async (id: string, action: 'approve' | 'reject') => {
    setLeaveActing(id);
    try {
      const route = action === 'approve' ? 'approve' : 'reject';
      await fetch(`/api/leaves/${id}/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: '' }) });
      fetchData(tab);
    } catch {}
    setLeaveActing(null);
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Approval Center</h1>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
              Exception requests from employees
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="text-sm font-bold px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected'] as const).map(t => (
            <button key={t} onClick={() => switchTab(t)}
              className="px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: tab === t ? 'rgba(249,115,22,0.15)' : '#f9fafb',
                color: tab === t ? '#f97316' : '#6b7280',
                border: `1px solid ${tab === t ? 'rgba(249,115,22,0.3)' : 'transparent'}`,
              }}>{t}</button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-2">
          <select value={corr.employeeId} onChange={e => setCorr(p => ({ ...p, employeeId: e.target.value }))}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563' }}>
            <option value="">Manual correction: select employee</option>
            {employees.map((e: any) => <option key={e._id} value={e._id}>{e.fullName}</option>)}
          </select>
          <input type="date" value={corr.date} onChange={e => setCorr(p => ({ ...p, date: e.target.value }))}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563' }} />
          <input type="time" value={corr.clockIn} onChange={e => setCorr(p => ({ ...p, clockIn: e.target.value }))}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563' }} />
          <input type="time" value={corr.clockOut} onChange={e => setCorr(p => ({ ...p, clockOut: e.target.value }))}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563' }} />
          <input type="text" value={corr.reason} onChange={e => setCorr(p => ({ ...p, reason: e.target.value }))}
            placeholder="Reason"
            className="px-3 py-2 rounded-xl text-xs focus:outline-none text-gray-700 placeholder-gray-400"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }} />
          <button onClick={saveCorrection} disabled={corrSaving}
            className="px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
            style={{ background: '#f97316', color: '#fff' }}>
            {corrSaving ? 'Saving...' : 'Apply'}
          </button>
        </div>
      </div>

      <div style={card} className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl" style={{ background: '#f9fafb' }}/>)}
          </div>
        ) : exceptions.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }}/>
            <div className="text-sm font-semibold text-gray-900">All clear</div>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>No {tab} requests</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f9fafb' }}>
            {exceptions.map(exc => {
              const tc = TYPE_LABEL[exc.type] || { label: exc.type, color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
              const isAccount = exc.type === 'account_approval';
              const schedule = isAccount ? ensureDraft(exc.employeeId) : null;
              const isCustom = schedule?.shiftType === 'CUSTOM';
              return (
                <div key={exc._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: avColor(exc.employeeName), color: '#fff' }}>
                      {initials(exc.employeeName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-900">{exc.employeeName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                        <span className="text-[10px] ml-auto" style={{ color: '#6b7280' }}>{timeAgo(exc.createdAt)}</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{exc.reason}</p>
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: '#6b7280' }}>
                        <span>{exc.date}</span>
                        {exc.requestedTime && <span>Requested: {exc.requestedTime}</span>}
                      </div>

                      {isAccount && exc.status === 'pending' && schedule && (
                        <div className="mt-3 p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                          <div className="text-[11px] font-semibold text-gray-900 mb-2">Shift Assignment</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-600 mb-1">Shift Type</label>
                              <select
                                value={schedule.shiftType}
                                onChange={(e) => {
                                  const next = e.target.value as ShiftType;
                                  const draft = templateToDraft(next);
                                  updateDraft(exc.employeeId || '', draft);
                                }}
                                className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none"
                                style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}
                              >
                                {Object.entries(SHIFT_TYPE_LABELS).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-600 mb-1">Work Start</label>
                              <input
                                type="time"
                                value={schedule.startTime}
                                disabled={!isCustom}
                                onChange={(e) => updateDraft(exc.employeeId || '', { startTime: e.target.value })}
                                className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none disabled:opacity-60"
                                style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-600 mb-1">Work End</label>
                              <input
                                type="time"
                                value={schedule.endTime}
                                disabled={!isCustom}
                                onChange={(e) => updateDraft(exc.employeeId || '', { endTime: e.target.value })}
                                className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none disabled:opacity-60"
                                style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-600 mb-1">Week Off</label>
                              <div className="text-[10px] text-gray-700 px-2 py-1.5 rounded-lg" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                                {schedule.weekOffs?.length ? schedule.weekOffs.join(', ') : 'None'}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="text-[10px] text-gray-600 mb-1">Break Schedule</div>
                            <div className="space-y-2">
                              {schedule.breaks.map((b, idx) => (
                                <div key={`${b.name}-${idx}`} className="grid grid-cols-4 gap-2">
                                  <input
                                    type="text"
                                    value={b.name}
                                    disabled={!isCustom}
                                    onChange={(e) => {
                                      const next = [...schedule.breaks];
                                      next[idx] = { ...next[idx], name: e.target.value };
                                      updateDraft(exc.employeeId || '', { breaks: next });
                                    }}
                                    placeholder="Name"
                                    className="px-2 py-1.5 rounded-lg text-xs focus:outline-none disabled:opacity-60"
                                    style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}
                                  />
                                  <input
                                    type="time"
                                    value={b.start}
                                    disabled={!isCustom}
                                    onChange={(e) => {
                                      const next = [...schedule.breaks];
                                      next[idx] = { ...next[idx], start: e.target.value };
                                      updateDraft(exc.employeeId || '', { breaks: next });
                                    }}
                                    className="px-2 py-1.5 rounded-lg text-xs focus:outline-none disabled:opacity-60"
                                    style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}
                                  />
                                  <input
                                    type="time"
                                    value={b.end}
                                    disabled={!isCustom}
                                    onChange={(e) => {
                                      const next = [...schedule.breaks];
                                      next[idx] = { ...next[idx], end: e.target.value };
                                      updateDraft(exc.employeeId || '', { breaks: next });
                                    }}
                                    className="px-2 py-1.5 rounded-lg text-xs focus:outline-none disabled:opacity-60"
                                    style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}
                                  />
                                  <input
                                    type="number"
                                    min={0}
                                    value={b.durationMinutes}
                                    disabled={!isCustom}
                                    onChange={(e) => {
                                      const next = [...schedule.breaks];
                                      next[idx] = { ...next[idx], durationMinutes: Number(e.target.value) };
                                      updateDraft(exc.employeeId || '', { breaks: next });
                                    }}
                                    className="px-2 py-1.5 rounded-lg text-xs focus:outline-none disabled:opacity-60"
                                    style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}
                                  />
                                </div>
                              ))}
                              {isCustom && (
                                <button
                                  onClick={() => {
                                    const next = [...schedule.breaks, { name: 'Break', start: '13:00', end: '13:15', durationMinutes: 15 }];
                                    updateDraft(exc.employeeId || '', { breaks: next });
                                  }}
                                  className="text-[10px] font-semibold text-orange-600"
                                >
                                  + Add Break
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="text-[10px] text-gray-600 mb-1">Week Offs</div>
                            <div className="flex flex-wrap gap-2">
                              {WEEK_DAYS.map(day => {
                                const checked = schedule.weekOffs.includes(day);
                                return (
                                  <label key={day} className="flex items-center gap-1 text-[10px] text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const next = e.target.checked
                                          ? [...schedule.weekOffs, day]
                                          : schedule.weekOffs.filter(d => d !== day);
                                        updateDraft(exc.employeeId || '', { weekOffs: next });
                                      }}
                                    />
                                    {day.slice(0, 3)}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {exc.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => act(exc._id, 'approved')} disabled={acting === exc._id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <CheckCircle2 className="w-3.5 h-3.5"/>Approve
                          </button>
                          <button onClick={() => act(exc._id, 'rejected')} disabled={acting === exc._id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <XCircle className="w-3.5 h-3.5"/>Reject
                          </button>
                        </div>
                      )}

                      {exc.status !== 'pending' && (
                        <div className="mt-2 text-xs font-semibold" style={{ color: exc.status === 'approved' ? '#10b981' : '#ef4444' }}>
                          {exc.status === 'approved' ? 'Approved' : 'Rejected'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Password Change Requests</h2>
        {pwdRequests.length === 0 ? (
          <div className="text-xs text-gray-700">No password change requests</div>
        ) : (
          <div className="space-y-2">
            {pwdRequests.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{r.employeeName}</div>
                  <div className="text-[11px]" style={{ color: '#6b7280' }}>{r.employeeEmail}</div>
                  <div className="text-[10px]" style={{ color: '#9ca3af' }}>{new Date(r.createdAt).toLocaleString('en-IN')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                    style={{ background: r.status === 'approved' ? 'rgba(16,185,129,0.15)' : r.status === 'rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: r.status === 'approved' ? '#10b981' : r.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>
                    {r.status}
                  </span>
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => actPwd(r._id, 'approve')} disabled={pwdActing === r._id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                        Approve
                      </button>
                      <button onClick={() => actPwd(r._id, 'reject')} disabled={pwdActing === r._id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Leave Requests</h2>
        {leaveRequests.length === 0 ? (
          <div className="text-xs text-gray-700">No pending leave requests</div>
        ) : (
          <div className="space-y-2">
            {leaveRequests.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{r.employeeName}</div>
                  <div className="text-[11px]" style={{ color: '#6b7280' }}>
                    {(r.leaveType || r.type)} • {r.startDate} - {r.endDate} • {(r.totalDays ?? r.days) || 0} day(s)
                  </div>
                  {r.reason && <div className="text-[10px]" style={{ color: '#9ca3af' }}>{r.reason}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                    pending
                  </span>
                  <button onClick={() => actLeave(r._id, 'approve')} disabled={leaveActing === r._id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                    Approve
                  </button>
                  <button onClick={() => actLeave(r._id, 'reject')} disabled={leaveActing === r._id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



