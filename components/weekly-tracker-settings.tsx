
'use client';
import { useEffect, useState } from 'react';

export default function WeeklyTrackerSettings() {
  const [labels, setLabels] = useState({ g1Label: 'G1', g2Label: 'G2', g3Label: 'G3', g4Label: 'G4', glToursLabel: 'GL Tours' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/tracker/weekly/config', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.ok && d.config) setLabels(d.config); })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/tracker/weekly/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(labels),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setMsg({ ok: true, text: 'Weekly tracker labels updated.' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div style={card} className="p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Weekly Tracker Labels</h2>
        <p className="text-xs text-gray-700">Customize labels used for G1-G4 and GL Tours.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: 'g1Label', label: 'G1 Label' },
          { key: 'g2Label', label: 'G2 Label' },
          { key: 'g3Label', label: 'G3 Label' },
          { key: 'g4Label', label: 'G4 Label' },
          { key: 'glToursLabel', label: 'GL Tours Label' },
        ].map((f) => (
          <div key={f.key}>
            <label className="block text-xs text-gray-700 mb-1.5">{f.label}</label>
            <input
              value={(labels as any)[f.key] || ''}
              onChange={(e) => setLabels(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
            />
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: '#f97316' }}
      >
        {saving ? 'Saving...' : 'Save Labels'}
      </button>
      {msg && <div className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</div>}
    </div>
  );
}

