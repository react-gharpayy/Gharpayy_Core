'use client';
import { useEffect, useState } from 'react';

export default function AdminTrackerDetail({ employeeId }: { employeeId: string }) {
  if (!employeeId) {
    return <div className="text-xs text-gray-500">No employee selected.</div>;
  }
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ start: '', end: '' });

  const defaultCheckins = [
    { key: 'G1MYT', label: 'G1MYT', range: '10:30 AM - 12:00 PM', status: 'idle', targetCount: 0, progressNote: '', startedAt: '', completedAt: '' },
    { key: 'G2MYT', label: 'G2MYT', range: '12:00 PM - 2:15 PM', status: 'idle', targetCount: 0, progressNote: '', startedAt: '', completedAt: '' },
    { key: 'G3MYT', label: 'G3MYT', range: '2:30 PM - 4:00 PM', status: 'idle', targetCount: 0, progressNote: '', startedAt: '', completedAt: '' },
    { key: 'G4MYT', label: 'G4MYT', range: '4:00 PM - 5:35 PM', status: 'idle', targetCount: 0, progressNote: '', startedAt: '', completedAt: '' },
  ];

  const buildDateRange = (start: string, end: string) => {
    if (!start || !end) return [];
    const out: string[] = [];
    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T00:00:00`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      out.push(iso);
    }
    return out;
  };

  const fetchDetail = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const r = await fetch(`/api/tracker/employee/${employeeId}?${params.toString()}`, { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) {
        setData(d);
        setRange({ start: d.range?.start || '', end: d.range?.end || '' });
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [employeeId]);

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  if (loading) {
    return <div className="text-xs text-gray-500">Loading tracker detail...</div>;
  }

  if (!data) {
    return <div className="text-xs text-gray-500">Unable to load tracker detail.</div>;
  }

  const displayRecords = (() => {
    if (Array.isArray(data.records) && data.records.length > 0) return data.records;
    const dates = buildDateRange(range.start, range.end);
    return dates.map((date) => ({
      _id: `empty-${date}`,
      date,
      initial: '',
      onIt: '',
      impact: '',
      notes: '',
      issues: '',
      isSubmitted: false,
      isEdited: false,
      dailyCheckins: defaultCheckins,
    }));
  })();

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">ARENA OS - Daily Updates Detail</h1>
        <div className="text-xs" style={{ color: '#6b7280' }}>
          {data.employee?.fullName} • {data.employee?.role}
        </div>
      </div>

      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Summary (Last 90 Days)</h2>
          <div className="flex items-center gap-2 text-xs">
            <input type="date" value={range.start} onChange={(e) => setRange(p => ({ ...p, start: e.target.value }))} className="px-2 py-1 rounded-lg border border-gray-200 bg-white" />
            <input type="date" value={range.end} onChange={(e) => setRange(p => ({ ...p, end: e.target.value }))} className="px-2 py-1 rounded-lg border border-gray-200 bg-white" />
            <button onClick={() => fetchDetail(range.start, range.end)} className="px-3 py-1 rounded-lg text-white text-xs" style={{ background: '#f97316' }}>Apply</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Total Days', value: data.summary.totalDays },
            { label: 'Submitted', value: data.summary.submittedDays, color: '#10b981' },
            { label: 'Edited', value: data.summary.editedDays, color: '#f59e0b' },
            { label: 'Missed', value: data.summary.missedDays, color: '#ef4444' },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="text-xl font-bold" style={{ color: s.color || '#111827' }}>{s.value || 0}</div>
              <div className="text-[10px]" style={{ color: '#6b7280' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Daily Records</h2>
        {displayRecords?.length ? (
          <div className="space-y-2">
            {displayRecords.map((r: any) => (
              <div key={r._id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{r.date}</div>
                  <div className={`font-semibold ${r.isEdited ? 'text-orange-500' : 'text-emerald-600'}`}>
                    {r.isEdited ? 'Edited' : r.isSubmitted ? 'Submitted' : 'Pending'}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-gray-500">INITIAL:</span> {r.initial || '-'}</div>
                  <div><span className="text-gray-500">ON IT:</span> {r.onIt || '-'}</div>
                  <div><span className="text-gray-500">IMPACT:</span> {r.impact || '-'}</div>
                  <div><span className="text-gray-500">NOTES:</span> {r.notes || '-'}</div>
                  <div><span className="text-gray-500">ISSUES:</span> {r.issues || '-'}</div>
                </div>
                {Array.isArray(r.dailyCheckins) && r.dailyCheckins.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {r.dailyCheckins.map((c: any) => (
                      <div key={c.key} className="p-2 rounded-lg border border-gray-100 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-semibold text-gray-900">{c.label}</div>
                          <div className="text-[10px]" style={{ color: '#6b7280' }}>{c.range}</div>
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1">{c.targetCount || 0} leads by this check-in</div>
                        <div className="text-[10px] text-gray-600 mt-1">{c.progressNote || '-'}</div>
                        <div className="text-[10px] text-gray-500 mt-1">Status: {c.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">No tracker records in this range.</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div style={card} className="p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Weekly View</h2>
          {Object.keys(data.weekly || {}).length === 0 ? (
            <div className="text-xs text-gray-500">No weekly data available.</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.weekly).map(([week, items]: any) => (
                <div key={week} className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                  <div className="font-semibold text-gray-900">{week}</div>
                  <div className="text-[10px] text-gray-600">{items.length} submission(s)</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={card} className="p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Monthly View</h2>
          {Object.keys(data.monthly || {}).length === 0 ? (
            <div className="text-xs text-gray-500">No monthly data available.</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.monthly).map(([month, items]: any) => (
                <div key={month} className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                  <div className="font-semibold text-gray-900">{month}</div>
                  <div className="text-[10px] text-gray-600">{items.length} submission(s)</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Missed Days</h2>
        {data.missedDates?.length ? (
          <div className="flex flex-wrap gap-2">
            {data.missedDates.map((d: string) => (
              <span key={d} className="text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">{d}</span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">No missed days in this range.</div>
        )}
      </div>
    </div>
  );
}
