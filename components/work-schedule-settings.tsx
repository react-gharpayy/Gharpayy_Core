'use client';
import { useEffect, useState } from 'react';
import { SHIFT_TEMPLATES, SHIFT_TYPE_LABELS, WEEK_DAYS, ShiftType, BreakItem } from '@/lib/shift-templates';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shiftType, setShiftType] = useState<ShiftType>('FT_MAIN');
  const [startTime, setStartTime] = useState('10:35');
  const [endTime, setEndTime] = useState('20:00');
  const [breaks, setBreaks] = useState<BreakItem[]>(SHIFT_TEMPLATES.FT_MAIN.breaks);
  const [weekOffs, setWeekOffs] = useState<string[]>(SHIFT_TEMPLATES.FT_MAIN.weekOffs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diff = (eH * 60 + eM) - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const addMinutes = (time: string, mins: number) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return time;
    let total = h * 60 + m + mins;
    total = total % (24 * 60); // Wrap around midnight
    if (total < 0) total += 24 * 60;
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const isAdmin = me?.role === 'admin';

  const loadSchedule = async (userId?: string) => {
    const q = userId ? `?userId=${userId}` : '';
    const r = await fetch(`/api/work-schedule${q}`, { cache: 'no-store' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed to load');
    const ws = d.user?.workSchedule || {};
    const wsType: ShiftType = ws.shiftType || (ws.startTime && ws.endTime ? 'CUSTOM' : 'FT_MAIN');
    const template = wsType !== 'CUSTOM' ? SHIFT_TEMPLATES[wsType] : null;
    const wsBreaks = Array.isArray(ws.breaks) && ws.breaks.length > 0 ? ws.breaks : (template?.breaks || []);
    const wsWeekOffs = Array.isArray(ws.weekOffs) && ws.weekOffs.length > 0 ? ws.weekOffs : (template?.weekOffs || []);
    setShiftType(wsType);
    setStartTime(ws.startTime || template?.workStart || '10:00');
    setEndTime(ws.endTime || template?.workEnd || '19:00');
    setBreaks(wsBreaks);
    setWeekOffs(wsWeekOffs);
  };

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
        const meData = await meRes.json();
        setMe(meData);

        if (meData?.role === 'admin' || meData?.role === 'manager') {
          const r = await fetch('/api/employees?page=1&limit=100', { cache: 'no-store' });
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === employees.length) setSelectedIds([]);
    else setSelectedIds(employees.map(e => e._id));
  };

  const saveBulk = async () => {
    if (!isAdmin || selectedIds.length === 0) return;
    setBulkSaving(true);
    setMsg(null);
    try {
      const body: any = { shiftType, startTime, endTime, breaks, weekOffs, userIds: selectedIds };
      const r = await fetch('/api/work-schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Bulk save failed');
      setMsg({ ok: true, text: `Shift updated for ${selectedIds.length} employee(s)` });
      setSelectedIds([]);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Bulk save failed' });
    } finally {
      setBulkSaving(false);
    }
  };

  const save = async () => {
    // Validation
    if (startTime === endTime) {
      setMsg({ ok: false, text: 'Work start and end time cannot be the same' });
      return;
    }

    for (const b of breaks) {
      if (calculateDuration(b.start, b.end) <= 0) {
        setMsg({ ok: false, text: `Break "${b.name}" has invalid timing (end must be after start)` });
        return;
      }
    }

    // Overlap check (basic)
    const sortedBreaks = [...breaks].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sortedBreaks.length - 1; i++) {
      if (sortedBreaks[i].end > sortedBreaks[i+1].start) {
        setMsg({ ok: false, text: 'Breaks cannot overlap' });
        return;
      }
    }

    setSaving(true);
    setMsg(null);
    try {
      const body: any = { shiftType, startTime, endTime, breaks, weekOffs };
      if (isAdmin && targetId) body.userId = targetId;
      const r = await fetch('/api/work-schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setMsg({ ok: true, text: 'Work schedule updated successfully' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const removeBreak = (idx: number) => {
    const next = breaks.filter((_, i) => i !== idx);
    setBreaks(next);
    if (!isCustom) setShiftType('CUSTOM');
  };

  const disableInputs = !isAdmin;
  const isCustom = shiftType === 'CUSTOM';
  const totalBreakMins = breaks.reduce((sum, b) => sum + Number(b.durationMinutes || 0), 0);

  const applyTemplate = (type: ShiftType) => {
    if (type === 'CUSTOM') return;
    const t = SHIFT_TEMPLATES[type];
    setStartTime(t.workStart);
    setEndTime(t.workEnd);
    setBreaks(t.breaks);
    setWeekOffs(t.weekOffs);
  };
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

        {isAdmin && employees.length > 0 && (
          <div className="p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={selectedIds.length === employees.length} onChange={toggleSelectAll} />
                Select all for bulk update
              </label>
              {selectedIds.length > 0 && (
                <button
                  onClick={saveBulk}
                  disabled={bulkSaving}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: '#f97316' }}
                >
                  {bulkSaving ? 'Applying...' : `Apply to ${selectedIds.length}`}
                </button>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
              {employees.map((u: any) => (
                <label key={u._id} className="flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" checked={selectedIds.includes(u._id)} onChange={() => toggleSelect(u._id)} />
                  {u.fullName} ({u.email})
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-700 mb-1.5">Shift Type</label>
          <select
            value={shiftType}
            disabled={disableInputs}
            onChange={(e) => {
              const next = e.target.value as ShiftType;
              setShiftType(next);
              applyTemplate(next);
            }}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
            style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
          >
            {Object.entries(SHIFT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Work Start Time</label>
            <input type="time" value={startTime} 
              disabled={disableInputs} 
              onChange={(e) => {
                setStartTime(e.target.value);
                if (!isCustom) setShiftType('CUSTOM');
              }}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:bg-gray-50"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }} />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1.5">Work End Time</label>
            <input type="time" value={endTime} 
              disabled={disableInputs} 
              onChange={(e) => {
                setEndTime(e.target.value);
                if (!isCustom) setShiftType('CUSTOM');
              }}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:bg-gray-50"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-700 mb-1.5">Break Schedule</label>
          <div className="space-y-3">
            {breaks.map((b, idx) => (
              <div key={`${b.name}-${idx}`} className="relative grid grid-cols-2 md:grid-cols-4 gap-2 p-2 rounded-lg bg-gray-50/50 border border-gray-100 group">
                {!disableInputs && (
                  <button
                    onClick={() => removeBreak(idx)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                    title="Remove break"
                  >
                    ✕
                  </button>
                )}
                <input
                  type="text"
                  value={b.name}
                  disabled={disableInputs}
                  onChange={(e) => {
                    const next = [...breaks];
                    next[idx] = { ...next[idx], name: e.target.value };
                    setBreaks(next);
                    if (!isCustom) setShiftType('CUSTOM');
                  }}
                  className="px-3 py-2 rounded-xl text-xs focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                />
                <input
                  type="time"
                  value={b.start}
                  disabled={disableInputs}
                  onChange={(e) => {
                    const next = [...breaks];
                    const start = e.target.value;
                    const end = addMinutes(start, next[idx].durationMinutes);
                    next[idx] = { ...next[idx], start, end };
                    setBreaks(next);
                    if (!isCustom) setShiftType('CUSTOM');
                  }}
                  className="px-3 py-2 rounded-xl text-xs focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                />
                <input
                  type="time"
                  value={b.end}
                  disabled={true} // Auto-calculated from start + duration
                  className="px-3 py-2 rounded-xl text-xs focus:outline-none disabled:opacity-50 disabled:bg-gray-100"
                  style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#111827' }}
                />
                <input
                  type="number"
                  min={0}
                  value={b.durationMinutes}
                  disabled={disableInputs}
                  onChange={(e) => {
                    const next = [...breaks];
                    const duration = Number(e.target.value);
                    const end = addMinutes(next[idx].start, duration);
                    next[idx] = { ...next[idx], durationMinutes: duration, end };
                    setBreaks(next);
                    if (!isCustom) setShiftType('CUSTOM');
                  }}
                  className="px-3 py-2 rounded-xl text-xs focus:outline-none disabled:opacity-50 disabled:bg-gray-100"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                />
              </div>
            ))}
            {!disableInputs && (
              <button
                onClick={() => {
                  setBreaks(p => [...p, { name: 'Break', start: '13:00', end: '13:15', durationMinutes: 15 }]);
                  if (!isCustom) setShiftType('CUSTOM');
                }}
                className="text-xs font-semibold text-orange-600"
              >
                + Add Break
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-700 mb-1.5">Week Off</label>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map(day => {
              const checked = weekOffs.includes(day);
              return (
                <label key={day} className="flex items-center gap-1 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disableInputs}
                    onChange={(e) => {
                      const next = e.target.checked ? [...weekOffs, day] : weekOffs.filter(d => d !== day);
                      setWeekOffs(next);
                    }}
                  />
                  {day.slice(0, 3)}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Shift Timing</div>
            <div className="text-xs font-bold text-gray-900">{to12h(startTime)} - {to12h(endTime)}</div>
          </div>
          <div className="text-center border-x border-gray-200">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Break Time</div>
            <div className="text-xs font-bold text-gray-900">
              {totalBreakMins >= 60 ? `${Math.floor(totalBreakMins / 60)}h ${totalBreakMins % 60}m` : `${totalBreakMins}m`}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Effective Work</div>
            <div className="text-xs font-bold text-orange-600">
              {((calculateDuration(startTime, endTime) - totalBreakMins) / 60).toFixed(1)}h
            </div>
          </div>
        </div>

        {isAdmin ? (
          <button onClick={save} disabled={saving || loading}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 shadow-sm transition-all active:scale-[0.98]"
            style={{ background: '#f97316' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        ) : (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs text-gray-500 font-medium">This section is read-only. Contact admin for any changes.</span>
          </div>
        )}
        {msg && (
          <div className={`p-3 rounded-xl text-xs font-medium ${msg.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
