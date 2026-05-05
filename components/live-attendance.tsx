'use client';
import { useEffect, useState, useCallback } from 'react';
import { Filter, RefreshCw, ChevronRight, X, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Employee {
  employeeId: string;
  employeeName: string;
  role: string;
  team: string;
  checkInTime: string | null;
  isCheckedIn: boolean;
  dayStatus: string;
  totalWorkMins: number;
  totalBreakMins?: number;
  workMode?: string;
  lateByMins?: number;
  earlyByMins?: number;
}

interface DrillDown {
  employee: { _id: string; fullName: string; email: string; role: string };
  attendance: {
    isCheckedIn: boolean; dayStatus: string;
    firstCheckIn: string | null; lastCheckOut: string | null;
    totalWorkMins: number; totalWorkFormatted: string;
    sessions: number; timeline: { time: string; label: string; type: string }[];
  } | null;
}

interface Zone { _id: string; name: string; }
interface Manager { _id: string; fullName: string; role: string; }

const WORK_MODE_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  Present: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', dot: '#10b981' },
  Break:   { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', dot: '#f59e0b' },
  Field:   { bg: 'rgba(99,102,241,0.12)', text: '#818cf8', dot: '#6366f1' },
  WFH:     { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', dot: '#a855f7' },
  Absent:  { bg: '#f9fafb', text: '#6b7280', dot: '#374151' },
};

const STATUS_ORDER: Record<string, number> = { 'Early': 0, 'On Time': 1, 'Late': 2, 'Absent': 3 };

const AVATAR_COLORS = [
  ['#f97316','#1a0f00'], ['#6366f1','#0d0d24'], ['#10b981','#001a0f'],
  ['#a855f7','#150024'], ['#f59e0b','#1a1300'], ['#ef4444','#1a0000'],
];
function avColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 6;
  return AVATAR_COLORS[h];
}
function initials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}
function fmtMins(m: number) {
  if (!m) return '0m'; const h = Math.floor(m / 60); const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}
function fmtISTTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}
function fmtHHMMtoISTLabel(v: string) {
  const [hh, mm] = (v || '').split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return v;
  const h12 = hh % 12 || 12;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}
function getTodayIST() { return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]; }

const FILTERS = ['All', 'Present', 'Break', 'Field', 'Absent'];

export default function LiveAttendance() {
  const [all, setAll] = useState<Employee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [present, setPresent] = useState(0);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('All');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rangeMode, setRangeMode] = useState(false);
  const [drill, setDrill] = useState<DrillDown | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  const [rulesForm, setRulesForm] = useState({ shiftStart: '10:00', shiftEnd: '19:00', graceMinutes: 15 });
  const [savingRules, setSavingRules] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [lateTrend, setLateTrend] = useState<{ date: string; late: number; present: number }[]>([]);
  const [teamComparison, setTeamComparison] = useState<{ team: string; total: number; present: number; late: number }[]>([]);
  const [userRole, setUserRole] = useState('');
  const [breakMode, setBreakMode] = useState<'today' | 'range' | 'weekly'>('today');
  const [breakRows, setBreakRows] = useState<any[]>([]);
  const [breakWeekly, setBreakWeekly] = useState<any[]>([]);
  const [breakLoading, setBreakLoading] = useState(false);

  const fetchData = useCallback((date = selectedDate, zone = selectedZone, manager = selectedManager, status = statusFilter, from = dateFrom, to = dateTo, useRange = rangeMode) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (useRange && from && to) {
      params.set('dateFrom', from);
      params.set('dateTo', to);
      params.set('date', to);
    } else {
      params.set('date', date);
    }
    if (zone) params.set('team', zone);
    if (manager) params.set('manager', manager);
    if (status) params.set('status', status);
    fetch(`/api/attendance/heatmap?${params}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.todayLog) {
          const sorted = [...d.todayLog].sort((a: any, b: any) => {
            const sd = (STATUS_ORDER[a.dayStatus] ?? 3) - (STATUS_ORDER[b.dayStatus] ?? 3);
            if (sd !== 0) return sd;
            if (!a.checkInTime) return 1; if (!b.checkInTime) return -1;
            return a.checkInTime.localeCompare(b.checkInTime);
          });
          setAll(sorted); setEmployees(sorted);
        }
        if (d.present !== undefined) setPresent(d.present);
        if (d.total !== undefined) setTotal(d.total);
        if (d.shiftInfo) setShiftInfo(d.shiftInfo);
        if (d.lateTrend) setLateTrend(d.lateTrend);
        if (d.teamComparison) setTeamComparison(d.teamComparison);
      })
      .catch(() => {}).finally(() => setLoading(false));
  }, [selectedDate, selectedZone, selectedManager, statusFilter, dateFrom, dateTo, rangeMode]);

  const fetchBreakReport = useCallback((mode = breakMode) => {
    setBreakLoading(true);
    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('date', selectedDate);
    if (mode === 'range' && dateFrom && dateTo) {
      params.set('dateFrom', dateFrom);
      params.set('dateTo', dateTo);
    }
    if (selectedZone) params.set('team', selectedZone);
    if (selectedManager) params.set('manager', selectedManager);
    fetch(`/api/attendance/break-report?${params.toString()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setBreakRows(d.dailyRows || []);
          setBreakWeekly(d.weeklySummary || []);
        }
      })
      .catch(() => {})
      .finally(() => setBreakLoading(false));
  }, [breakMode, selectedDate, dateFrom, dateTo, selectedZone, selectedManager]);

  useEffect(() => {
    fetchData();
    fetch('/api/zones').then(r => r.json()).then(d => { if (d.zones) setZones(d.zones); }).catch(() => {});
    fetch('/api/org').then(r => r.json()).then(d => { if (d.availableManagers) setManagers(d.availableManagers); }).catch(() => {});
    fetch('/api/attendance/rules').then(r => r.json()).then(d => {
      if (d?.rules) setRulesForm({
        shiftStart: d.rules.shiftStart || '10:00',
        shiftEnd: d.rules.shiftEnd || '19:00',
        graceMinutes: Number(d.rules.graceMinutes || 15),
      });
    }).catch(() => {});
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.role) setUserRole(d.role); }).catch(() => {});
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, []);

  const saveRules = async () => {
    setSavingRules(true);
    try {
      const r = await fetch('/api/attendance/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rulesForm),
      });
      const d = await r.json();
      if (d?.ok) fetchData();
    } catch {}
    setSavingRules(false);
  };

  useEffect(() => {
    if (filter === 'All') { setEmployees(all); return; }
    if (filter === 'Present') setEmployees(all.filter(e => e.workMode === 'Present' || (e.isCheckedIn && !e.workMode)));
    else setEmployees(all.filter(e => e.workMode === filter || e.dayStatus === filter));
  }, [filter, all]);

  useEffect(() => {
    fetchBreakReport();
  }, [breakMode, selectedDate, dateFrom, dateTo, selectedZone, selectedManager]);

  const openDrill = async (empId: string) => {
    setDrillLoading(true); setDrill(null);
    try { const r = await fetch(`/api/attendance/employee?id=${empId}`); setDrill(await r.json()); } catch {}
    setDrillLoading(false);
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
  const today = getTodayIST();
  const isToday = selectedDate === today;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Attendance Management</h1>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {isToday ? 'Today' : selectedDate} - <span style={{ color: '#10b981' }}>{present}</span>/{total} present
            </div>
          </div>
          <button onClick={() => fetchData()}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition hover:bg-gray-100"
            style={{ background: '#f9fafb', color: '#6b7280' }}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Mode filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: filter === f ? 'rgba(249,115,22,0.15)' : '#f9fafb',
                color: filter === f ? '#f97316' : '#6b7280',
                border: `1px solid ${filter === f ? 'rgba(249,115,22,0.3)' : 'transparent'}`,
              }}>{f}</button>
          ))}
        </div>

        {/* Date + Zone */}
        <div className="flex gap-2">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f97316' }} />
            <input type="date" value={selectedDate} max={today}
              onChange={e => { setSelectedDate(e.target.value); fetchData(e.target.value, selectedZone); }}
              className="bg-transparent text-sm w-full focus:outline-none" style={{ color: '#374151' }} />
          </div>
          <select value={selectedZone}
            onChange={e => { setSelectedZone(e.target.value); fetchData(selectedDate, e.target.value, selectedManager, statusFilter, dateFrom, dateTo, rangeMode); }}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563' }}>
            <option value="">All Zones</option>
            {zones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
          </select>
        </div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
          {userRole !== 'manager' && (
            <select value={selectedManager}
              onChange={e => { setSelectedManager(e.target.value); fetchData(selectedDate, selectedZone, e.target.value, statusFilter, dateFrom, dateTo, rangeMode); }}
              className="px-3 py-2 rounded-xl text-xs focus:outline-none"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563' }}>
              <option value="">All Managers</option>
              {managers.map(m => <option key={m._id} value={m._id}>{m.fullName}</option>)}
            </select>
          )}
          <select value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); fetchData(selectedDate, selectedZone, selectedManager, e.target.value, dateFrom, dateTo, rangeMode); }}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563' }}>
            <option value="all">All Status</option>
            <option value="Early">Early</option>
            <option value="On Time">On Time</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs focus:outline-none"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563' }} />
          <div className="flex gap-2">
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#4b5563' }} />
            <button
              onClick={() => { setRangeMode(true); fetchData(selectedDate, selectedZone, selectedManager, statusFilter, dateFrom, dateTo, true); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: '#f97316', color: '#fff' }}
            >
              Range
            </button>
          </div>
        </div>

        {/* Shift info */}
        {shiftInfo && (
          <>
            <div className="mt-3 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#6b7280' }}>
              Shift {fmtHHMMtoISTLabel(shiftInfo.shiftStart || rulesForm.shiftStart)} - {fmtHHMMtoISTLabel(shiftInfo.shiftEnd || rulesForm.shiftEnd)} IST | Grace {shiftInfo.graceMinutes ?? rulesForm.graceMinutes}m
            </div>
            {userRole === 'admin' && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                <input
                  type="time"
                  value={rulesForm.shiftStart}
                  onChange={e => setRulesForm(p => ({ ...p, shiftStart: e.target.value }))}
                  className="px-2 py-1.5 rounded-lg text-xs focus:outline-none"
                  style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#374151' }}
                />
                <input
                  type="time"
                  value={rulesForm.shiftEnd}
                  onChange={e => setRulesForm(p => ({ ...p, shiftEnd: e.target.value }))}
                  className="px-2 py-1.5 rounded-lg text-xs focus:outline-none"
                  style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#374151' }}
                />
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={rulesForm.graceMinutes}
                  onChange={e => setRulesForm(p => ({ ...p, graceMinutes: Number(e.target.value) }))}
                  className="px-2 py-1.5 rounded-lg text-xs focus:outline-none"
                  style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#374151' }}
                />
                <button
                  onClick={saveRules}
                  disabled={savingRules}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: '#f97316', color: '#ffffff' }}
                >
                  {savingRules ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {(lateTrend.length > 0 || teamComparison.length > 0) && (
        <div style={card} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-bold text-gray-900 mb-2">Late Trend (7 days)</div>
            <div className="space-y-2">
              {lateTrend.map(t => (
                <div key={t.date} className="flex items-center gap-2 text-xs">
                  <span style={{ color: '#6b7280', width: 70 }}>{t.date.slice(5)}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: '#f3f4f6' }}>
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (t.late / Math.max(t.present || 1, 1)) * 100)}%`, background: '#f59e0b' }} />
                  </div>
                  <span style={{ color: '#f59e0b' }}>{t.late}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 mb-2">Team Comparison</div>
            <div className="space-y-2">
              {teamComparison.map(t => (
                <div key={t.team} className="flex items-center justify-between text-xs">
                  <span style={{ color: '#374151' }}>{t.team}</span>
                  <span style={{ color: '#6b7280' }}>{t.present}/{t.total} present | {t.late} late</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Employee List */}
      <div style={card} className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2 animate-pulse">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl" style={{ background: '#f9fafb' }}/>)}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: '#6b7280' }}>No records found</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f9fafb' }}>
            {employees.map(emp => {
              const mode = emp.workMode || (emp.isCheckedIn ? 'Present' : 'Absent');
              const mc = WORK_MODE_COLOR[mode] || WORK_MODE_COLOR.Absent;
              const [bg, fg] = avColor(emp.employeeName);
              return (
                <button key={emp.employeeId} onClick={() => openDrill(emp.employeeId)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-gray-50">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: bg, color: fg }}>{initials(emp.employeeName)}</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{ background: mc.dot, borderColor: '#ffffff' }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{emp.employeeName}</div>
                    <div className="text-[10px]" style={{ color: '#6b7280' }}>{emp.team}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs" style={{ color: '#6b7280' }}>{emp.checkInTime || '--'}</div>
                      {(emp as any).lateByMins > 0 && <div className="text-[10px]" style={{ color: '#f59e0b' }}>Late {(emp as any).lateByMins}m</div>}
                      {(emp as any).earlyByMins > 0 && <div className="text-[10px]" style={{ color: '#10b981' }}>Early {(emp as any).earlyByMins}m</div>}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: mc.bg, color: mc.text }}>{mode}</span>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: '#9ca3af' }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Break Report */}
      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Day-wise Break Report</h2>
            <div className="text-[10px]" style={{ color: '#6b7280' }}>
              {selectedDate} - Break minutes (MM) for all employees
            </div>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          {(['today', 'range', 'weekly'] as const).map(m => (
            <button
              key={m}
              onClick={() => setBreakMode(m)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: breakMode === m ? 'rgba(249,115,22,0.15)' : '#f9fafb',
                color: breakMode === m ? '#f97316' : '#6b7280',
                border: `1px solid ${breakMode === m ? 'rgba(249,115,22,0.3)' : 'transparent'}`,
              }}
            >
              {m === 'today' ? 'Today' : m === 'range' ? 'Date Range' : 'Weekly'}
            </button>
          ))}
        </div>
        {breakLoading ? (
          <div className="text-xs text-gray-500">Loading break data...</div>
        ) : breakMode === 'weekly' ? (
          breakWeekly.length === 0 ? (
            <div className="text-xs text-gray-500">No records for this week.</div>
          ) : (
            <div className="space-y-2">
              {[...breakWeekly]
                .sort((a, b) => (b.totalBreakMins || 0) - (a.totalBreakMins || 0))
                .map((emp: any) => (
                  <div key={`break-week-${emp.employeeId}`} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{emp.employeeName}</div>
                      <div className="text-[10px]" style={{ color: '#6b7280' }}>{emp.team} - {emp.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{emp.totalBreakMins || 0}m</div>
                      <div className="text-[10px]" style={{ color: '#6b7280' }}>Work {emp.totalWorkMins || 0}m</div>
                    </div>
                  </div>
                ))}
            </div>
          )
        ) : (
          breakRows.length === 0 ? (
            <div className="text-xs text-gray-500">No records for this range.</div>
          ) : (
            <div className="space-y-2">
              {[...breakRows]
                .sort((a, b) => (a.date === b.date ? (b.totalBreakMins || 0) - (a.totalBreakMins || 0) : b.date.localeCompare(a.date)))
                .map((emp: any, idx: number) => (
                  <div key={`break-${emp.employeeId}-${emp.date}-${idx}`} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{emp.employeeName}</div>
                      <div className="text-[10px]" style={{ color: '#6b7280' }}>{emp.date} - {emp.team} - {emp.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{emp.totalBreakMins || 0}m</div>
                      <div className="text-[10px]" style={{ color: '#6b7280' }}>Work {emp.totalWorkMins || 0}m</div>
                    </div>
                  </div>
                ))}
            </div>
          )
        )}
      </div>

      {/* Drill-down modal */}
      {(drillLoading || drill) && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setDrill(null)}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden max-h-[85vh] overflow-y-auto no-scrollbar"
            style={{ background: '#ffffff', border: '1px solid #d1d5db' }}
            onClick={e => e.stopPropagation()}>
            {drillLoading ? (
              <div className="p-8 animate-pulse space-y-3">
                <div className="h-6 rounded w-1/2" style={{ background: '#f3f4f6' }}/>
                <div className="h-24 rounded-2xl" style={{ background: '#f9fafb' }}/>
              </div>
            ) : drill && (
              <>
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: avColor(drill.employee.fullName)[0], color: avColor(drill.employee.fullName)[1] }}>
                      {initials(drill.employee.fullName)}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{drill.employee.fullName}</div>
                      <div className="text-xs capitalize" style={{ color: '#6b7280' }}>{drill.employee.role} - {drill.employee.email}</div>
                    </div>
                  </div>
                  <button onClick={() => setDrill(null)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition"
                    style={{ color: '#6b7280' }}><X className="w-4 h-4"/></button>
                </div>

                <div className="p-5 space-y-4">
                  {!drill.attendance ? (
                    <div className="text-center py-8">
                      <div className="text-sm font-semibold text-gray-900 mb-1">Absent</div>
                      <div className="text-xs" style={{ color: '#6b7280' }}>No attendance record for this date</div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Clocked In',   value: drill.attendance.firstCheckIn ? fmtISTTime(drill.attendance.firstCheckIn) : '--' },
                          { label: 'Clocked Out',  value: drill.attendance.lastCheckOut ? fmtISTTime(drill.attendance.lastCheckOut) : drill.attendance.isCheckedIn ? 'Active' : '--' },
                          { label: 'Total Worked', value: drill.attendance.totalWorkFormatted },
                          { label: 'Sessions',     value: String(drill.attendance.sessions) },
                        ].map(s => (
                          <div key={s.label} className="p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                            <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>{s.label}</div>
                            <div className="text-sm font-bold text-gray-900">{s.value}</div>
                          </div>
                        ))}
                      </div>

                      {drill.attendance.timeline.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#6b7280' }}>Timeline</div>
                          <div className="space-y-2">
                            {drill.attendance.timeline.map((ev, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                                style={{ background: ev.type === 'checkin' ? 'rgba(16,185,129,0.08)' : '#f9fafb', border: `1px solid ${ev.type === 'checkin' ? 'rgba(16,185,129,0.15)' : '#f9fafb'}` }}>
                                {ev.type === 'checkin' ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0"/> : <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#6b7280' }}/>}
                                <span className="text-sm flex-1" style={{ color: '#374151' }}>{ev.label}</span>
                                <span className="text-xs" style={{ color: '#6b7280' }}>{ev.time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



