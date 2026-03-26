'use client';
import { useEffect, useState } from 'react';
import EmployeeSidebar from '@/components/employee-sidebar';
import { Calendar } from 'lucide-react';

interface AttRecord {
  date: string;
  dayStatus: string;
  workMode: string;
  totalWorkMins: number;
  totalBreakMins: number;
  lateByMins: number;
  earlyByMins: number;
  isCheckedIn: boolean;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
}

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  'Early':   { color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  'On Time': { color: '#818cf8', bg: 'rgba(99,102,241,0.12)'  },
  'Late':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  'Absent':  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
};

function fmtMins(m: number) {
  if (!m) return '--'; const h = Math.floor(m / 60); const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

function getMonthRange(offset = 0) {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + offset;
  const start = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];
  const label = new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

export default function MyHistory() {
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  const { start, label } = getMonthRange(monthOffset);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance/history?month=${start.slice(0, 7)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.records)) setRecords(d.records);
      })
      .catch(() => {}).finally(() => setLoading(false));
  }, [monthOffset, start]);

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
  const presentCount = records.filter(r => r.dayStatus !== 'Absent').length;
  const lateCount = records.filter(r => r.dayStatus === 'Late').length;

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <EmployeeSidebar />
      <div className="md:ml-64 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          <div style={card} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ARENA OS - My History</h1>
                <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{label}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setMonthOffset(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:bg-gray-100"
                  style={{ background: '#f3f4f6', color: '#6b7280' }}>&lt;</button>
                <button onClick={() => setMonthOffset(0)}
                  className="px-3 py-1.5 rounded-xl text-xs transition"
                  style={{ background: '#f3f4f6', color: '#6b7280' }}>Today</button>
                <button onClick={() => setMonthOffset(p => Math.min(0, p + 1))}
                  disabled={monthOffset === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:bg-gray-100 disabled:opacity-30"
                  style={{ background: '#f3f4f6', color: '#6b7280' }}>&gt;</button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Present', value: presentCount, color: '#10b981' },
                { label: 'Absent',  value: records.length - presentCount, color: '#ef4444' },
                { label: 'Late/Early', value: `${lateCount}/${records.filter(r => r.dayStatus === 'Early').length}`, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: '#f9fafb' }}>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={card} className="overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-2 animate-pulse">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-xl" style={{ background: '#f9fafb' }}/>)}
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }}/>
                <div className="text-sm text-gray-900 font-semibold">No records this month</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="grid grid-cols-4 px-4 py-2.5 border-b" style={{ borderColor: '#f9fafb' }}>
                  {['Date', 'Status', 'Late/Early', 'Hours'].map(h => (
                    <div key={h} className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>{h}</div>
                  ))}
                </div>
                <div className="divide-y" style={{ borderColor: '#f9fafb' }}>
                  {records.map(r => {
                    const sc = STATUS_COLOR[r.dayStatus] || STATUS_COLOR.Absent;
                    const variance = r.dayStatus === 'Late'
                      ? `+${r.lateByMins || 0}m`
                      : r.dayStatus === 'Early'
                        ? `-${r.earlyByMins || 0}m`
                        : '--';
                    return (
                      <div key={r.date} className="grid grid-cols-4 px-4 py-3 items-center hover:bg-gray-50 transition">
                        <div className="text-sm" style={{ color: '#374151' }}>{fmtDate(r.date)}</div>
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: sc.bg, color: sc.color }}>
                            {r.dayStatus}
                          </span>
                        </div>
                        <div className="text-sm" style={{ color: '#6b7280' }}>{variance}</div>
                        <div className="text-sm" style={{ color: '#6b7280' }}>
                          {r.dayStatus === 'Absent' ? '--' : fmtMins(r.totalWorkMins) || '--'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}




