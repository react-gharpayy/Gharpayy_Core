'use client';
import { useEffect, useState } from 'react';
import { CalendarPlus, Trash2 } from 'lucide-react';

type Holiday = {
  _id: string;
  name: string;
  date: string;
  type: 'public' | 'optional';
  description?: string;
};

export default function HolidayManager() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'public' | 'optional'>('public');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    fetch('/api/holidays', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.holidays)) setHolidays(d.holidays); })
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name || !date) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, type, description: desc }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setName(''); setDate(''); setDesc(''); setType('public');
      load();
      setMsg({ ok: true, text: 'Holiday added' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Failed to add' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this holiday?')) return;
    await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
    load();
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Holiday Calendar</h1>
        <p className="text-xs mt-1 text-gray-700">Manage org holidays used by leave and attendance rules.</p>
      </div>

      <div style={card} className="p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Holiday name"
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <select value={type} onChange={e => setType(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="public">Public</option>
            <option value="optional">Optional</option>
          </select>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button onClick={add} disabled={saving}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#f97316' }}>
            {saving ? 'Adding...' : 'Add Holiday'}
          </button>
        </div>
        {msg && <div className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</div>}
      </div>

      <div style={card} className="overflow-hidden">
        {holidays.length === 0 ? (
          <div className="p-8 text-sm text-gray-600 text-center">No holidays added yet.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            {holidays.map(h => (
              <div key={h._id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{h.name}</div>
                  <div className="text-xs text-gray-600">{h.date} • {h.type}</div>
                  {h.description && <div className="text-[11px] text-gray-500">{h.description}</div>}
                </div>
                <button onClick={() => remove(h._id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
