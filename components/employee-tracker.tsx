'use client';
import { useEffect, useState } from 'react';

const EMPTY = { initial: '', onIt: '', impact: '', notes: '', issues: '' };

export default function EmployeeTracker() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tracker, setTracker] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/tracker/today', { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) {
        setTracker(d.tracker || null);
        if (d.tracker) {
          setForm({
            initial: d.tracker.initial || '',
            onIt: d.tracker.onIt || '',
            impact: d.tracker.impact || '',
            notes: d.tracker.notes || '',
            issues: d.tracker.issues || '',
          });
        } else {
          setForm(EMPTY);
        }
      }
    } catch {
      setTracker(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (p = 1) => {
    try {
      const r = await fetch(`/api/tracker/history?page=${p}&limit=10`, { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) {
        setHistory(d.records || []);
        setPage(d.page || 1);
        setTotalPages(d.totalPages || 1);
      }
    } catch {
      setHistory([]);
      setPage(1);
      setTotalPages(1);
    }
  };

  useEffect(() => {
    fetchToday();
    fetchHistory(1);
  }, []);

  const save = async (submit = false) => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/tracker/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, submit }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setTracker(d.tracker);
      setMsg({
        ok: true,
        text: submit ? 'Update submitted.' : 'Progress saved.',
      });
      fetchHistory(1);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const status = tracker?.isSubmitted ? (tracker?.isEdited ? 'Edited' : 'Submitted') : 'Draft';

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Daily Updates</h1>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Save progress anytime, submit when complete</div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-xl"
            style={{ background: status === 'Submitted' ? 'rgba(16,185,129,0.15)' : status === 'Edited' ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.1)', color: status === 'Submitted' ? '#10b981' : status === 'Edited' ? '#f59e0b' : '#6b7280' }}>
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
        {loading ? (
          <div className="text-xs text-gray-500">Loading tracker...</div>
        ) : (
          <>
            {[
              { key: 'initial', label: 'INITIAL' },
              { key: 'onIt', label: 'ON IT' },
              { key: 'impact', label: 'IMPACT' },
              { key: 'notes', label: 'NOTES' },
              { key: 'issues', label: 'ISSUES' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs text-gray-700 mb-1.5">{field.label}</label>
                <textarea
                  rows={3}
                  value={(form as any)[field.key]}
                  onChange={(e) => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
                />
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="w-full py-3 rounded-2xl text-sm font-semibold border border-gray-200 disabled:opacity-60"
                style={{ background: '#ffffff', color: '#374151' }}
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: '#f97316' }}
              >
                {saving ? 'Saving...' : tracker?.isSubmitted ? 'Submit Update' : 'Submit Final'}
              </button>
            </div>
          </>
        )}
      </div>

      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Your Recent Updates</h2>
          <div className="text-[10px]" style={{ color: '#6b7280' }}>Last submissions</div>
        </div>
        {history.length === 0 ? (
          <div className="text-xs text-gray-500">No tracker history yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h._id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{h.date}</div>
                  <span className="text-[10px] font-semibold" style={{ color: h.isEdited ? '#f59e0b' : '#10b981' }}>
                    {h.isEdited ? 'Edited' : h.isSubmitted ? 'Submitted' : 'Pending'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-gray-600">
                  {h.initial ? `${h.initial.slice(0, 90)}${h.initial.length > 90 ? '...' : ''}` : 'No details'}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 text-[10px] text-gray-600">
          <button disabled={page <= 1} onClick={() => fetchHistory(page - 1)} className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-50">Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => fetchHistory(page + 1)} className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
