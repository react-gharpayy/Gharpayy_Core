'use client';
import { useEffect, useState } from 'react';

export default function ShiftSettings() {
  const [rules, setRules] = useState({ shiftStart: '10:00', shiftEnd: '19:00', graceMinutes: 15 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/attendance/rules', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.rules) {
          setRules({
            shiftStart: d.rules.shiftStart || '10:00',
            shiftEnd: d.rules.shiftEnd || '19:00',
            graceMinutes: Number(d.rules.graceMinutes || 15),
          });
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/attendance/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rules, earlyGraceMinutes: 0 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setMsg({ ok: true, text: 'Shift settings updated' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Shift Settings</h1>
        <p className="text-xs mt-1 text-gray-700">Configure shift timings and grace period</p>
      </div>
      <div style={card} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Start Time</label>
            <input type="time" value={rules.shiftStart} onChange={e => setRules(p => ({ ...p, shiftStart: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">End Time</label>
            <input type="time" value={rules.shiftEnd} onChange={e => setRules(p => ({ ...p, shiftEnd: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1.5">Grace Period (minutes)</label>
          <input type="number" min={0} max={180} value={rules.graceMinutes}
            onChange={e => setRules(p => ({ ...p, graceMinutes: Number(e.target.value) }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <button onClick={save} disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#f97316' }}>
          {saving ? 'Saving...' : 'Save Shift Settings'}
        </button>
        {msg && <div className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</div>}
      </div>
    </div>
  );
}
