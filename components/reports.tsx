'use client';
import { useState } from 'react';
import { FileText, BarChart2, Download, CheckSquare, AlertTriangle, MapPin, Clock } from 'lucide-react';

const REPORTS = [
  { id: 'daily_attendance',  icon: FileText,      color: '#10b981', label: 'Daily Attendance',      desc: 'Present/absent/break breakdown for today' },
  { id: 'daily_breaks',      icon: Clock,         color: '#f59e0b', label: 'Daily Break Report',     desc: 'Day-wise break minutes for all employees' },
  { id: 'weekly_breaks',     icon: Clock,         color: '#f97316', label: 'Weekly Break Report',    desc: 'Weekly break minutes per employee (use date to pick week end)' },
  { id: 'monthly_attendance', icon: Clock,        color: '#f97316', label: 'Monthly Attendance',    desc: 'Day-wise attendance export for selected month' },
  { id: 'weekly_summary',    icon: BarChart2,     color: '#6366f1', label: 'Weekly Task Summary',   desc: 'Completion rates and blockers' },
  { id: 'kpi_export',        icon: Download,      color: '#f59e0b', label: 'KPI Export',            desc: 'Team KPIs vs targets CSV' },
  { id: 'notice_ack',        icon: CheckSquare,   color: '#a855f7', label: 'Notice Acknowledgment', desc: 'Read receipts per notice' },
  { id: 'break_violations',  icon: AlertTriangle, color: '#ef4444', label: 'Break Violations',      desc: 'Employees over break limit' },
  { id: 'geo_compliance',    icon: MapPin,        color: '#3b82f6', label: 'Geo Compliance',        desc: 'Clock-in location logs' },
];

export default function Reports() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const generate = async (id: string) => {
    setGenerating(id);
    try {
      const params = new URLSearchParams({ type: id, format });
      if (id === 'monthly_attendance') params.set('month', month);
      if (id === 'daily_breaks' || id === 'weekly_breaks') params.set('date', date);
      const res = await fetch(`/api/reports/export?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.${format === 'excel' ? 'xls' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(p => [...p, id]);
      setTimeout(() => setDone(p => p.filter(x => x !== id)), 4000);
    } finally {
      setGenerating(null);
    }
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">ARENA OS - Reports</h1>
        <div className="text-xs" style={{ color: '#6b7280' }}>Export operational data</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'excel')}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel (.xls)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Month (for Monthly Attendance)</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
            />
          </div>
          <div>
            <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Date (for Daily/Weekly Break Report)</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REPORTS.map(rep => {
          const Icon = rep.icon;
          const isGenerating = generating === rep.id;
          const isDone = done.includes(rep.id);
          return (
            <div key={rep.id} style={card} className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${rep.color}18` }}>
                <Icon className="w-5 h-5" style={{ color: rep.color }}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm mb-1">{rep.label}</div>
                <div className="text-[11px] mb-3" style={{ color: '#6b7280' }}>{rep.desc}</div>
                <button onClick={() => generate(rep.id)} disabled={isGenerating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
                  style={{
                    background: isDone ? 'rgba(16,185,129,0.15)' : `${rep.color}18`,
                    color: isDone ? '#10b981' : rep.color,
                    border: `1px solid ${isDone ? 'rgba(16,185,129,0.2)' : `${rep.color}30`}`,
                  }}>
                  {isGenerating ? (
                    <><div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"/>Generating...</>
                  ) : isDone ? (
                    <>Generated</>
                  ) : (
                    <><Download className="w-3 h-3"/>Generate</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



