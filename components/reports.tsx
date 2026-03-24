'use client';
import { useState } from 'react';
import { FileText, BarChart2, Download, CheckSquare, AlertTriangle, MapPin } from 'lucide-react';

const REPORTS = [
  { id: 'daily_attendance',  icon: FileText,      color: '#10b981', label: 'Daily Attendance',      desc: 'Present/absent/break breakdown for today' },
  { id: 'weekly_summary',    icon: BarChart2,     color: '#6366f1', label: 'Weekly Task Summary',   desc: 'Completion rates and blockers' },
  { id: 'kpi_export',        icon: Download,      color: '#f59e0b', label: 'KPI Export',            desc: 'Team KPIs vs targets CSV' },
  { id: 'notice_ack',        icon: CheckSquare,   color: '#a855f7', label: 'Notice Acknowledgment', desc: 'Read receipts per notice' },
  { id: 'break_violations',  icon: AlertTriangle, color: '#ef4444', label: 'Break Violations',      desc: 'Employees over break limit' },
  { id: 'geo_compliance',    icon: MapPin,        color: '#3b82f6', label: 'Geo Compliance',        desc: 'Clock-in location logs' },
];

export default function Reports() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  const generate = async (id: string) => {
    setGenerating(id);
    // Simulate report generation
    await new Promise(r => setTimeout(r, 1500));
    setGenerating(null);
    setDone(p => [...p, id]);
    setTimeout(() => setDone(p => p.filter(x => x !== id)), 4000);
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reports</h1>
        <div className="text-xs" style={{ color: '#6b7280' }}>Export operational data</div>
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



