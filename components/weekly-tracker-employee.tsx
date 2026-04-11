'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getCurrentWeekInfo, getWeekRange } from '@/lib/week-utils';

const EMPTY_FORM = {
  drafts30: 0,
  mytAdded: 0,
  toursPipeline: 0,
  toursDone: 0,
  callsDone: 0,
  connected: 0,
  doubts: '',
  manualLeadsToday: 0,
  manualToursToday: 0,
};

export default function WeeklyTrackerEmployee() {
  const now = useMemo(() => getCurrentWeekInfo(), []);
  const [year, setYear] = useState(now.year);
  const [weekNumber, setWeekNumber] = useState(now.weekNumber);
  const [weekRange, setWeekRange] = useState(getWeekRange(now.year, now.weekNumber));
  const [tracker, setTracker] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openMetrics, setOpenMetrics] = useState(true);
  const [openDoubts, setOpenDoubts] = useState(true);
  const [openDailyKpis, setOpenDailyKpis] = useState(true);

  const isCurrentWeek = year === now.year && weekNumber === now.weekNumber;
  const isFutureWeek = year > now.year || (year === now.year && weekNumber > now.weekNumber);
  const status = tracker?.status || 'draft';
  const canEdit = !isFutureWeek && status !== 'reviewed' && (status === 'draft' || isCurrentWeek);

  useEffect(() => {
    setWeekRange(getWeekRange(year, weekNumber));
  }, [year, weekNumber]);

  const loadWeek = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/tracker/weekly?year=${year}&week=${weekNumber}`, { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) {
        const rec = Array.isArray(d.records) ? d.records[0] : null;
        setTracker(rec || null);
        if (rec) {
          setForm({
            drafts30: Number(rec.drafts30 || 0),
            mytAdded: Number(rec.mytAdded || 0),
            toursPipeline: Number(rec.toursPipeline || 0),
            toursDone: Number(rec.toursDone || 0),
            callsDone: Number(rec.callsDone || 0),
            connected: Number(rec.connected || 0),
            doubts: rec.doubts || '',
            manualLeadsToday: Number(rec.manualLeadsToday || 0),
            manualToursToday: Number(rec.manualToursToday || 0),
          });
        } else {
          setForm(EMPTY_FORM);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const r = await fetch(`/api/tracker/weekly?year=${year}`, { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) setHistory(d.records || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadWeek();
    loadHistory();
  }, [year, weekNumber]);

  const save = async (nextStatus: 'draft' | 'submitted') => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = { year, weekNumber, ...form, status: nextStatus };
      const r = await fetch('/api/tracker/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setTracker(d.tracker);
      setMsg({ ok: true, text: nextStatus === 'submitted' ? 'Week submitted.' : 'Draft saved.' });
      loadHistory();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const years = [now.year - 1, now.year].filter((y, idx, arr) => arr.indexOf(y) === idx);

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
  const LEADS_TARGET = 40;
  const TOURS_TARGET = 10;
  const leadsDone = Number(form.manualLeadsToday || 0);
  const toursDone = Number(form.manualToursToday || 0);
  const leadsRemaining = Math.max(0, LEADS_TARGET - leadsDone);
  const toursRemaining = Math.max(0, TOURS_TARGET - toursDone);
  const leadsPct = Math.min(100, Math.round((leadsDone / LEADS_TARGET) * 100));
  const toursPct = Math.min(100, Math.round((toursDone / TOURS_TARGET) * 100));

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div style={card} className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Daily Tracker</h1>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
              Week {weekNumber} ({weekRange.startDate} - {weekRange.endDate})
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-xl"
            style={{
              background: status === 'reviewed' ? 'rgba(16,185,129,0.15)' : status === 'submitted' ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.1)',
              color: status === 'reviewed' ? '#10b981' : status === 'submitted' ? '#f59e0b' : '#6b7280',
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-2xl text-sm font-medium border ${
          msg.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>{msg.text}</div>
      )}

      <div style={card} className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Week</label>
            <select
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
            >
              {Array.from({ length: 44 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Date Range</label>
            <div className="px-3 py-2.5 rounded-xl text-sm" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827' }}>
              {weekRange.startDate} - {weekRange.endDate}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={card} className="p-5 text-xs text-gray-500">Loading weekly tracker...</div>
      ) : (
        <>
          <div style={card} className="p-5 space-y-4">
            <button onClick={() => setOpenMetrics(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-900">
              Weekly Metrics
              {openMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'drafts30', label: '30 DRAFTS?' },
                  { key: 'mytAdded', label: 'MYT ADDED' },
                  { key: 'toursPipeline', label: 'TOURS IN PIPELINE' },
                  { key: 'toursDone', label: 'TOURS DONE' },
                  { key: 'callsDone', label: 'CALLS DONE' },
                  { key: 'connected', label: 'CONNECTED' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-700 mb-1.5">{f.label}</label>
                    <input
                      type="number"
                      min={0}
                      disabled={!canEdit}
                      value={form[f.key] ?? 0}
                      onChange={(e) => setForm((p: any) => ({ ...p, [f.key]: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                      style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card} className="p-5 space-y-4">
            <button onClick={() => setOpenDailyKpis(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-900">
              Daily KPI Check-ins
              {openDailyKpis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openDailyKpis && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-900">LEADS ADDED TODAY</div>
                    <div className="text-[10px]" style={{ color: '#6b7280' }}>Target {LEADS_TARGET}</div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{leadsDone} <span className="text-sm text-gray-500">/ {LEADS_TARGET}</span></div>
                  <div className="text-[11px] mt-1" style={{ color: '#6b7280' }}>{leadsDone} done · {leadsRemaining} to go</div>
                  <div className="w-full h-1.5 rounded-full mt-3" style={{ background: '#f3f4f6' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${leadsPct}%`, background: '#f97316' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-2" style={{ color: '#6b7280' }}>
                    <span>{leadsPct}% of daily target</span>
                    <span>On pace for {leadsDone} by EOD</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-1" style={{ color: '#6b7280' }}>
                    <span>{leadsDone} leads added</span>
                    <span>{leadsRemaining} more to go</span>
                  </div>
                  <div className="text-[11px] mt-2" style={{ color: '#6b7280' }}>
                    At the current pace, you’re tracking to finish with {leadsDone}. Pick up speed after lunch.
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min={0}
                      value={leadsDone}
                      onChange={(e) => setForm((p: any) => ({ ...p, manualLeadsToday: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 rounded-xl text-sm border border-gray-200"
                    />
                    <button
                      onClick={() => setForm((p: any) => ({ ...p, manualLeadsToday: Number(p.manualLeadsToday || 0) + 1 }))}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200"
                    >
                      +1 lead
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-900">TOURS SCHEDULED TODAY</div>
                    <div className="text-[10px]" style={{ color: '#6b7280' }}>Target {TOURS_TARGET}</div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{toursDone} <span className="text-sm text-gray-500">/ {TOURS_TARGET}</span></div>
                  <div className="text-[11px] mt-1" style={{ color: '#6b7280' }}>{toursDone} done · {toursRemaining} to go</div>
                  <div className="w-full h-1.5 rounded-full mt-3" style={{ background: '#f3f4f6' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${toursPct}%`, background: '#f97316' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-2" style={{ color: '#6b7280' }}>
                    <span>{toursPct}% of daily target</span>
                    <span>On pace for {toursDone} by EOD</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-1" style={{ color: '#6b7280' }}>
                    <span>{toursDone} tours scheduled</span>
                    <span>{toursRemaining} more needed</span>
                  </div>
                  <div className="text-[11px] mt-2" style={{ color: '#6b7280' }}>
                    Next check-in window opens at afternoon. Update your progress then.
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min={0}
                      value={toursDone}
                      onChange={(e) => setForm((p: any) => ({ ...p, manualToursToday: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 rounded-xl text-sm border border-gray-200"
                    />
                    <button
                      onClick={() => setForm((p: any) => ({ ...p, manualToursToday: Number(p.manualToursToday || 0) + 1 }))}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200"
                    >
                      +1 tour
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={card} className="p-5 space-y-4">
            <button onClick={() => setOpenDoubts(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-900">
              DOUBTS
              {openDoubts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openDoubts && (
              <div>
                <label className="block text-xs text-gray-700 mb-1.5">Doubts / Blockers</label>
                <textarea
                  rows={4}
                  disabled={!canEdit}
                  value={form.doubts || ''}
                  onChange={(e) => setForm((p: any) => ({ ...p, doubts: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                />
              </div>
            )}
          </div>

          {tracker?.status === 'reviewed' && (
            <div style={card} className="p-5 space-y-2">
              <div className="text-sm font-semibold text-gray-900">Admin Review</div>
              {tracker?.isGoodWeek && (
                <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-600">Good Week ✓</span>
              )}
              <div className="text-xs text-gray-700">Admin Notes: {tracker?.adminNotes || '—'}</div>
              <div className="text-xs text-gray-700">Impact Assessment: {tracker?.adminImpact || '—'}</div>
              <div className="text-xs text-gray-700">Issues Noted: {tracker?.adminIssues || '—'}</div>
            </div>
          )}

          {!canEdit && tracker?.status === 'submitted' && !isCurrentWeek && (
            <div className="text-xs text-gray-600">Submitted weeks are locked after the week ends.</div>
          )}
          {isFutureWeek && (
            <div className="text-xs text-gray-600">Future weeks cannot be submitted yet.</div>
          )}
        </>
      )}

      <div className="hidden md:flex gap-3">
        <button
          onClick={() => save('draft')}
          disabled={saving || !canEdit}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-60"
          style={{ color: '#374151', background: '#fff' }}
        >
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          onClick={() => save('submitted')}
          disabled={saving || !canEdit}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#f97316' }}
        >
          {saving ? 'Submitting...' : 'Submit Week'}
        </button>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <button
            onClick={() => save('draft')}
            disabled={saving || !canEdit}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-60"
            style={{ color: '#374151', background: '#fff' }}
          >
            Draft
          </button>
          <button
            onClick={() => save('submitted')}
            disabled={saving || !canEdit}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#f97316' }}
          >
            Submit
          </button>
        </div>
      </div>

      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Weekly History ({year})</h2>
          <div className="text-[10px]" style={{ color: '#6b7280' }}>Latest weeks</div>
        </div>
        {history.length === 0 ? (
          <div className="text-xs text-gray-500">No weekly tracker history yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h._id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Week {h.weekNumber}</div>
                  <span className="text-[10px] font-semibold" style={{ color: h.status === 'reviewed' ? '#10b981' : h.status === 'submitted' ? '#f59e0b' : '#6b7280' }}>
                    {h.status}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-gray-600">{h.weekStartDate} - {h.weekEndDate}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
