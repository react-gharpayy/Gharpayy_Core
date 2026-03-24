'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, Bell } from 'lucide-react';

interface CCData {
  summary: {
    total: number; present: number; absent: number;
    late: number; early: number; onTime: number;
    onBreak: number; inField: number; activeNow: number;
  };
  healthScore: number;
  kpis: { attendance: number; onTimeRate: number; taskCompletion: number; breakDiscipline: number; };
  teamPulse: { employeeId: string; employeeName: string; team: string; workMode: string; dayStatus: string; checkInTime: string | null; }[];
  taskSummary: { blocked: number; overdue: number; total: number; completed: number; };
  pendingApprovals: number;
  needAction: { type: string; count: number; label: string; }[];
  date: string;
}

const MODE_DOT: Record<string, string> = {
  Present: '#10b981', Break: '#f59e0b', Field: '#6366f1', WFH: '#a855f7', Absent: '#374151',
};
const MODE_LABEL_COLOR: Record<string, string> = {
  Present: '#10b981', Break: '#f59e0b', Field: '#6366f1', WFH: '#a855f7', Absent: '#9ca3af',
};

const AVATAR_COLORS = [
  ['#f97316','#1a0f00'], ['#6366f1','#0d0d24'], ['#10b981','#001a0f'],
  ['#a855f7','#150024'], ['#f59e0b','#1a1300'], ['#ef4444','#1a0000'],
];
function avColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function initials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function KPIRing({ value, label, color, trend }: { value: number; label: string; color: string; trend?: string }) {
  const r = 30; const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const trackColor = '#f3f4f6';
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
      <div className="relative flex items-center justify-center" style={{ width: 76, height: 76 }}>
        <svg width="76" height="76" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
          <circle cx="38" cy="38" r={r} fill="none" stroke={trackColor} strokeWidth="6"/>
          <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}/>
        </svg>
        <div className="text-center z-10">
          <div className="text-base font-bold text-gray-900">{value}%</div>
        </div>
      </div>
      <div className="text-[10px] text-center mt-1.5 leading-tight" style={{ color: '#6b7280' }}>{label}</div>
      {trend && <div className="text-[9px] mt-0.5" style={{ color: trend.startsWith('+') ? '#10b981' : '#ef4444' }}>{trend}</div>}
    </div>
  );
}

export default function CommandCenter() {
  const router = useRouter();
  const [data, setData] = useState<CCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState('');

  const fetchData = useCallback(() => {
    fetch('/api/command-center', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }));
    tick();
    const clock = setInterval(tick, 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, [fetchData]);

  const scoreColor = (s: number) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-44 rounded-2xl" style={{ background: '#ffffff' }}/>
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl" style={{ background: '#ffffff' }}/>)}
      </div>
      <div className="h-48 rounded-2xl" style={{ background: '#ffffff' }}/>
    </div>
  );

  if (!data) return <div className="text-center py-12 text-gray-700">Failed to load</div>;

  const { summary, healthScore, kpis, teamPulse, taskSummary, pendingApprovals, needAction } = data;

  return (
    <div className="space-y-4">

      {/* Header Card */}
      <div style={card} className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" style={{  }}/>
              <span className="text-xs font-semibold" style={{ color: '#10b981' }}>
                {summary.activeNow} of {summary.total} Active Today
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {time} - Bangalore
            </div>
            {needAction.length > 0 && (
              <div className="mt-2 text-xs" style={{ color: '#6b7280' }}>
                {needAction.length} item{needAction.length > 1 ? 's' : ''} need attention - {pendingApprovals} approvals pending
              </div>
            )}
          </div>

          {/* Health Score */}
          <div className="flex items-center gap-3">
            <button onClick={fetchData}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-gray-100"
              style={{ color: '#6b7280' }}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-end">
              <div className="text-[10px] mb-1" style={{ color: '#6b7280' }}>COMPANY HEALTH</div>
              <div className="flex items-center gap-2">
                <div className="text-right text-[10px] space-y-0.5" style={{ color: '#6b7280' }}>
                  <div>Attendance <span className="text-gray-900 font-semibold">{kpis.attendance}%</span></div>
                  <div>Execution <span className="text-gray-900 font-semibold">{kpis.taskCompletion}%</span></div>
                  <div>On Time <span className="text-gray-900 font-semibold">{kpis.onTimeRate}%</span></div>
                </div>
                <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
                  <svg width="64" height="64" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#f3f4f6" strokeWidth="6"/>
                    <circle cx="32" cy="32" r="26" fill="none" stroke={scoreColor(healthScore)} strokeWidth="6"
                      strokeDasharray={`${(healthScore/100)*2*Math.PI*26} ${2*Math.PI*26}`} strokeLinecap="round"/>
                  </svg>
                  <div className="z-10 text-center">
                    <div className="text-lg font-bold text-gray-900 leading-none">{healthScore}</div>
                    <div className="text-[8px]" style={{ color: '#6b7280' }}>SCORE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Active Now */}
        <div style={{ ...card, cursor: 'pointer' }} className="p-4 hover:border-emerald-500/30 transition-all"
          onClick={() => router.push('/live-attendance')}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#6b7280' }}>ACTIVE NOW</span>
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{  }}/>
          </div>
          <div className="text-4xl font-bold" style={{ color: '#10b981' }}>{summary.activeNow}</div>
          <div className="text-[10px] mt-1.5 space-y-0.5" style={{ color: '#6b7280' }}>
            {summary.onBreak > 0 && <div>{summary.onBreak} on break</div>}
            {summary.inField > 0 && <div>{summary.inField} in field</div>}
            {summary.onBreak === 0 && summary.inField === 0 && <div>All in office</div>}
          </div>
        </div>

        {/* Need Action */}
        <div style={{ ...card, cursor: 'pointer' }} className="p-4 hover:border-amber-500/30 transition-all"
          onClick={() => router.push('/task-board')}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#6b7280' }}>NEED ACTION</span>
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
          </div>
          <div className="text-4xl font-bold" style={{ color: '#f59e0b' }}>{needAction.length}</div>
          <div className="text-[10px] mt-1.5" style={{ color: '#6b7280' }}>
            {needAction[0]?.label || 'All clear'}
          </div>
        </div>

        {/* Approvals */}
        <div style={{ ...card, cursor: 'pointer' }} className="p-4 hover:border-orange-500/30 transition-all"
          onClick={() => router.push('/approvals')}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#6b7280' }}>APPROVALS</span>
            {pendingApprovals > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#f97316', color: '#fff' }}>{pendingApprovals}</span>
            )}
          </div>
          <div className="text-4xl font-bold" style={{ color: '#f97316' }}>{pendingApprovals}</div>
          <div className="text-[10px] mt-1.5" style={{ color: '#6b7280' }}>Break &amp; attendance</div>
        </div>
      </div>

      {/* KPIs This Week */}
      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-gray-900">KPIs - This Week</h2>
          <span className="text-[10px]" style={{ color: '#6b7280' }}>Live</span>
        </div>
        <div className="grid grid-cols-4 gap-2 justify-items-center">
          <KPIRing value={kpis.attendance}      label="Attendance"       color="#10b981" trend="+1%" />
          <KPIRing value={kpis.taskCompletion}  label="Task Completion"  color="#6366f1" trend="-2%" />
          <KPIRing value={kpis.onTimeRate}       label="On Time Rate"    color="#f59e0b" trend="+3%" />
          <KPIRing value={kpis.breakDiscipline} label="Break Discipline" color="#ef4444" trend="-1%" />
        </div>
      </div>

      {/* Live Team Pulse */}
      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Live</h2>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: '#6b7280' }}>
            {(['Present','Break','Field','WFH','Absent'] as const).map(m => (
              <span key={m} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: MODE_DOT[m] }}/>
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Subheader */}
        <div className="grid grid-cols-2 gap-1 mb-3 text-[10px] font-semibold uppercase tracking-wide px-1"
          style={{ color: '#9ca3af' }}>
          <span>Team - Present - Field - Break - WFH</span>
        </div>

        <div className="space-y-1 max-h-72 overflow-y-auto no-scrollbar">
          {teamPulse.map(emp => {
            const [bg, fg] = avColor(emp.employeeName);
            return (
              <div key={emp.employeeId}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push('/live-attendance')}>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: bg, color: fg }}>
                      {initials(emp.employeeName)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{ background: MODE_DOT[emp.workMode], borderColor: '#ffffff' }}/>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 leading-tight">
                      {emp.employeeName.split(' ').map((n, i) => i === 0 ? n : n[0] + '.').join(' ')}
                    </div>
                    <div className="text-[10px]" style={{ color: '#6b7280' }}>{emp.team}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {emp.checkInTime && (
                    <span className="text-[10px]" style={{ color: '#6b7280' }}>{emp.checkInTime}</span>
                  )}
                  <span className="text-xs font-semibold" style={{ color: MODE_LABEL_COLOR[emp.workMode] }}>
                    - {emp.workMode}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Need Action List */}
      {needAction.length > 0 && (
        <div style={{ ...card, borderColor: 'rgba(245,158,11,0.2)' }} className="p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }}/>
            Needs Your Attention
          </h2>
          <div className="space-y-2">
            {needAction.map((item, i) => (
              <div key={i}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-all"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
                onClick={() => router.push(item.type === 'blocked_tasks' || item.type === 'overdue' ? '/task-board' : '/live-attendance')}>
                <span className="text-sm" style={{ color: '#374151' }}>{item.label}</span>
                <span className="text-xs font-semibold" style={{ color: '#f97316' }}>View -&gt;</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}



