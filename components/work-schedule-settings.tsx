'use client';
import { useEffect, useState } from 'react';

function to12h(v?: string) {
  const [hh, mm] = String(v || '').split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return '--';
  const h12 = hh % 12 || 12;
  const ap = hh >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}

export default function WorkScheduleSettings() {
  const [me, setMe] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [targetId, setTargetId] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [breakDuration, setBreakDuration] = useState(45);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isAdmin = me?.role === 'admin' || me?.role === 'manager';

  const loadSchedule = async (userId?: string) => {
    const q = userId ? `?userId=${userId}` : '';
    const r = await fetch(`/api/work-schedule${q}`, { cache: 'no-store' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed to load');
    const ws = d.user?.workSchedule || {};
    setStartTime(ws.startTime || '10:00');
    setEndTime(ws.endTime || '19:00');
    setBreakDuration(Number(ws.breakDuration || 45));
    setLocked(!!ws.isLocked);
  };

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
        const meData = await meRes.json();
        setMe(meData);

        if (meData?.role === 'admin' || meData?.role === 'manager') {
          const r = await fetch('/api/employees', { cache: 'no-store' });
          const d = await r.json();
          const users = Array.isArray(d.users) ? d.users.filter((u: any) => u.role === 'employee') : [];
          setEmployees(users);
          if (users[0]?._id) {
            setTargetId(users[0]._id);
            await loadSchedule(users[0]._id);
          }
        } else {
          await loadSchedule();
        }
      } catch (e: any) {
        setMsg({ ok: false, text: e.message || 'Unable to load schedule' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onTargetChange = async (id: string) => {
    setTargetId(id);
    setLoading(true);
    try {
      await loadSchedule(id);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Unable to load schedule' });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const body: any = { startTime, endTime, breakDuration };
      if (isAdmin && targetId) body.userId = targetId;
      const r = await fetch('/api/work-schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setLocked(true);
      setMsg({ ok: true, text: 'Work schedule saved successfully' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const disableInputs = !isAdmin && locked;
  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Settings</h1>
        <p className="text-xs mt-1 text-gray-700">Work timing and break timing configuration</p>
      </div>

      <div style={card} className="p-5 space-y-4">
        {isAdmin && (
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Select Employee</label>
            <select
              value={targetId}
              onChange={(e) => onTargetChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
            >
              {employees.map((u: any) => <option key={u._id} value={u._id}>{u.fullName} ({u.email})</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Work Start Time</label>
            <input type="time" value={startTime} disabled={disableInputs} onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }} />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Work End Time</label>
            <input type="time" value={endTime} disabled={disableInputs} onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-700 mb-1.5">Break Duration (minutes)</label>
          <input type="number" min={0} max={240} value={breakDuration} disabled={disableInputs}
            onChange={(e) => setBreakDuration(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
            style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }} />
        </div>

        <div className="text-xs text-gray-700 p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          Current schedule: {to12h(startTime)} - {to12h(endTime)} | Break {breakDuration}m | Lock: {locked ? 'Locked' : 'Unlocked'}
        </div>

        {!disableInputs && (
          <button onClick={save} disabled={saving || loading}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#f97316' }}>
            {saving ? 'Saving...' : isAdmin ? 'Save (Admin Override)' : 'Save and Lock'}
          </button>
        )}
        {disableInputs && (
          <div className="text-xs text-gray-700">This schedule is locked. Contact admin for changes.</div>
        )}
        {msg && <div className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</div>}
      </div>
    </div>
  );
}
