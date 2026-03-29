'use client';
import { useEffect, useState } from 'react';

const LEAVE_TYPES = ['Paid', 'Sick', 'Casual', 'Comp Off', 'LOP'] as const;

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export default function MyLeaves() {
  const [balance, setBalance] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'Paid', startDate: '', endDate: '', reason: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, lRes] = await Promise.all([
        fetch('/api/leaves/balance', { cache: 'no-store' }),
        fetch('/api/leaves/my', { cache: 'no-store' }),
      ]);
      const bData = await bRes.json();
      const lData = await lRes.json();
      if (bData.balance) setBalance(bData.balance);
      if (Array.isArray(lData.leaves)) setLeaves(lData.leaves);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const applyLeave = async () => {
    if (!form.startDate || !form.endDate) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/leaves/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to apply');
      setForm({ type: 'Paid', startDate: '', endDate: '', reason: '' });
      setMsg({ ok: true, text: 'Leave request submitted' });
      load();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Failed to apply' });
    } finally {
      setSaving(false);
    }
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <h1 className="text-2xl font-bold text-gray-900">ARENA OS - My Leaves</h1>
        <p className="text-xs mt-1 text-gray-700">Apply leaves and track your balance.</p>
      </div>

      <div style={card} className="p-5 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500">
            {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="Reason (optional)"
            className="px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button onClick={applyLeave} disabled={saving}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#f97316' }}>
            {saving ? 'Submitting...' : 'Apply Leave'}
          </button>
        </div>
        {msg && <div className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</div>}
      </div>

      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Leave Balance</h2>
        {balance ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
            {[
              { label: 'Paid', value: balance.paid },
              { label: 'Sick', value: balance.sick },
              { label: 'Casual', value: balance.casual },
              { label: 'Comp Off', value: balance.compOff },
              { label: 'LOP', value: balance.lop },
              { label: 'Encashable', value: balance.encashable },
            ].map(b => (
              <div key={b.label} className="p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                <div className="text-lg font-bold text-gray-900">{b.value ?? 0}</div>
                <div className="text-[10px] text-gray-600">{b.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-600">{loading ? 'Loading balance...' : 'No balance found'}</div>
        )}
      </div>

      <div style={card} className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: '#f3f4f6' }}>
          <h2 className="text-sm font-bold text-gray-900">My Leave Requests</h2>
        </div>
        {leaves.length === 0 ? (
          <div className="p-6 text-sm text-gray-600 text-center">No leave requests yet.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f9fafb' }}>
            {leaves.map(l => (
              <div key={l._id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{l.type}</div>
                    <div className="text-xs text-gray-600">{fmtDate(l.startDate)} - {fmtDate(l.endDate)} • {l.days} day(s)</div>
                    {l.reason && <div className="text-[11px] text-gray-500">{l.reason}</div>}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${
                    l.status === 'approved' ? 'bg-green-50 text-green-700' : l.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                  }`}>{l.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
