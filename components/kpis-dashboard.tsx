'use client';
import { useEffect, useState } from 'react';

function KPIRing({ value, label, color, size = 80 }: { value: number; label: string; color: string; size?: number }) {
  const r = (size / 2) - 8; const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="6"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${(value/100)*circ} ${circ}`} strokeLinecap="round"/>
        </svg>
        <div className="z-10 text-center">
          <div className="text-base font-bold text-gray-900 leading-none">{value}%</div>
        </div>
      </div>
      <div className="text-[10px] text-center leading-tight" style={{ color: '#6b7280' }}>{label}</div>
    </div>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: '#4b5563' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: '#f3f4f6' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${value}%`, background: color }}/>
      </div>
    </div>
  );
}

export default function KPIsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/command-center', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 rounded-2xl" style={{ background: '#ffffff' }}/>
      <div className="h-64 rounded-2xl" style={{ background: '#ffffff' }}/>
    </div>
  );

  const kpis = data?.kpis || { attendance: 0, onTimeRate: 0, taskCompletion: 0, breakDiscipline: 0 };
  const summary = data?.summary || {};

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">ARENA OS - Performance Analytics</h1>
        <div className="text-xs" style={{ color: '#6b7280' }}>Performance metrics - this week</div>
      </div>

      {/* KPI Scorecard */}
      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-5">KPI Scorecard</h2>
        <div className="grid grid-cols-4 gap-4 justify-items-center">
          <KPIRing value={kpis.attendance}      label="Attendance"       color="#10b981"/>
          <KPIRing value={kpis.taskCompletion}  label="Task Completion"  color="#6366f1"/>
          <KPIRing value={kpis.onTimeRate}       label="On Time Rate"    color="#f59e0b"/>
          <KPIRing value={kpis.breakDiscipline} label="Break Discipline" color="#ef4444"/>
        </div>
      </div>

      {/* KRAs by Team */}
      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-5">KRAs by Team</h2>
        <div className="space-y-4">
          <ProgressBar label="Sales - Lead Conversion"     value={84} color="#10b981"/>
          <ProgressBar label="Ops - Property Coordination" value={92} color="#6366f1"/>
          <ProgressBar label="Field - Visit Completion"    value={78} color="#f59e0b"/>
          <ProgressBar label="BD - New Partnerships"       value={65} color="#a855f7"/>
        </div>
      </div>

      {/* Attendance Stats */}
      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Attendance Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',   value: summary.total   || 0, color: '#4b5563' },
            { label: 'Present', value: summary.present || 0, color: '#10b981' },
            { label: 'Absent',  value: summary.absent  || 0, color: '#ef4444' },
            { label: 'Late',    value: summary.late    || 0, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl text-center"
              style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
              <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] mt-1" style={{ color: '#6b7280' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers placeholder */}
      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Top Performers</h2>
        <div className="space-y-2">
          {data?.teamPulse?.filter((e: any) => e.workMode !== 'Absent').slice(0, 5).map((emp: any, i: number) => (
            <div key={emp.employeeId} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
              <span className="text-sm font-bold w-6 text-center" style={{ color: i === 0 ? '#f59e0b' : '#6b7280' }}>#{i+1}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#6366f1', color: '#fff' }}>
                {emp.employeeName.split(' ').filter(Boolean).map((n: string) => n[0]).slice(0,2).join('').toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{emp.employeeName}</div>
                <div className="text-[10px]" style={{ color: '#6b7280' }}>{emp.team}</div>
              </div>
              <span className="text-sm font-bold" style={{ color: '#10b981' }}>
                {emp.dayStatus === 'Early' ? '100%' : emp.dayStatus === 'On Time' ? '95%' : '80%'}
              </span>
            </div>
          ))}
          {(!data?.teamPulse || data.teamPulse.filter((e: any) => e.workMode !== 'Absent').length === 0) && (
            <div className="text-center py-6 text-xs" style={{ color: '#6b7280' }}>No data yet today</div>
          )}
        </div>
      </div>
    </div>
  );
}



