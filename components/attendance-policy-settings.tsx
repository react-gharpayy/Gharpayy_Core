'use client';
import { useEffect, useState } from 'react';

export default function AttendancePolicySettings() {
  const [policy, setPolicy] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    fetch('/api/attendance-policy', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.policy) setPolicy(d.policy); })
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/attendance-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setPolicy(d.policy);
      setMsg({ ok: true, text: 'Policy saved' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  if (!policy) return <div className="text-sm text-gray-600">Loading policy...</div>;

  const update = (patch: Partial<typeof policy>) => setPolicy((p: any) => ({ ...p, ...patch }));

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Attendance Policy</h1>
        <p className="text-xs mt-1 text-gray-700">Configure overtime, penalties, exclusions, and access rules.</p>
      </div>

      <div style={card} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Policy Name</label>
            <input value={policy.name || ''} onChange={e => update({ name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Grace Minutes</label>
            <input type="number" min={0} max={180} value={Number(policy.graceMinutes || 0)}
              onChange={e => update({ graceMinutes: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={!!policy.overtimeEnabled} onChange={e => update({ overtimeEnabled: e.target.checked })} />
            Overtime Enabled
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={!!policy.compOffEnabled} onChange={e => update({ compOffEnabled: e.target.checked })} />
            Comp Off Enabled
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Overtime After (mins)</label>
            <input type="number" min={0} value={Number(policy.overtimeAfterMinutes || 0)}
              onChange={e => update({ overtimeAfterMinutes: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Late Penalty</label>
            <div className="flex gap-2">
              <select value={policy.latePenaltyType || 'fixed'} onChange={e => update({ latePenaltyType: e.target.value })}
                className="px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="fixed">Fixed</option>
                <option value="per_minute">Per Minute</option>
              </select>
              <input type="number" min={0} value={Number(policy.latePenaltyValue || 0)}
                onChange={e => update({ latePenaltyValue: Number(e.target.value) })}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={!!policy.holidayExclusionEnabled} onChange={e => update({ holidayExclusionEnabled: e.target.checked })} />
            Exclude Holidays from Leave Count
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={!!policy.weeklyOffExclusionEnabled} onChange={e => update({ weeklyOffExclusionEnabled: e.target.checked })} />
            Exclude Weekly Offs from Leave Count
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={!!policy.latePenaltyEnabled} onChange={e => update({ latePenaltyEnabled: e.target.checked })} />
            Late Penalty Enabled
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={!!policy.lopDeductionEnabled} onChange={e => update({ lopDeductionEnabled: e.target.checked })} />
            LOP Deduction Enabled
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={!!policy.ipRestrictionEnabled} onChange={e => update({ ipRestrictionEnabled: e.target.checked })} />
            IP Restriction Enabled
          </label>
          <input
            type="text"
            placeholder="Allowed IPs comma separated"
            value={Array.isArray(policy.allowedIPs) ? policy.allowedIPs.join(', ') : ''}
            onChange={e => update({ allowedIPs: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            className="px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-700 mb-1.5">Default Week Offs</label>
          <input
            type="text"
            placeholder="Sunday, Saturday"
            value={Array.isArray(policy.weekOffs) ? policy.weekOffs.join(', ') : ''}
            onChange={e => update({ weekOffs: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <button onClick={save} disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#f97316' }}>
          {saving ? 'Saving...' : 'Save Policy'}
        </button>
        {msg && <div className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</div>}
      </div>
    </div>
  );
}
