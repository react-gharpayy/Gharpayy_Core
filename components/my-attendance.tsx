'use client';
import { useEffect, useState, useRef } from 'react';
import EmployeeSidebar from '@/components/employee-sidebar';

const BREAK_LIMIT_MINS = 45;

function fmtClock(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

const TIMELINE_COLOR: Record<string, string> = {
  checkin: '#10b981', checkout: '#374151', break_start: '#f59e0b', break_end: '#6366f1', field_exit: '#3b82f6', field_return: '#10b981',
};
const TIMELINE_DOT: Record<string, string> = {
  checkin: 'bg-emerald-500', checkout: 'bg-gray-600', break_start: 'bg-yellow-400', break_end: 'bg-indigo-500', field_exit: 'bg-blue-500', field_return: 'bg-emerald-500',
};

export default function MyAttendance() {
  const [att, setAtt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  const fetchStatus = () => {
    fetch('/api/attendance/status', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setAtt(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Live timer
  useEffect(() => {
    clearInterval(timerRef.current);
    if (att?.isCheckedIn && att?.firstCheckIn) {
      const start = new Date(att.firstCheckIn).getTime();
      const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      update();
      timerRef.current = setInterval(update, 1000);
    } else if (att?.totalWorkMins) {
      setElapsed(att.totalWorkMins * 60);
    }
    return () => clearInterval(timerRef.current);
  }, [att?.isCheckedIn, att?.firstCheckIn, att?.totalWorkMins]);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const doAction = async (endpoint: string, body: object = {}) => {
    setClocking(true);
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.ok) { flash(getSuccessMsg(body), true); fetchStatus(); }
      else flash(d.error || 'Failed', false);
    } catch { flash('Network error', false); }
    setClocking(false);
  };

  const getSuccessMsg = (body: any) => {
    if (!body.type) return 'Clocked in successfully';
    if (body.type === 'break_start') return 'Break started';
    if (body.type === 'break_end') return 'Break ended - welcome back';
    if (body.type === 'field_exit') return 'Field visit started';
    if (body.type === 'field_return') return 'Returned from field';
    return 'Done';
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

  const workMode = att?.workMode || 'Absent';
  const modeColor: Record<string, string> = { Present: '#10b981', Break: '#f59e0b', Field: '#6366f1', WFH: '#a855f7', Absent: '#9ca3af' };

  const breakPct = att?.totalBreakMins ? Math.min(100, Math.round((att.totalBreakMins / BREAK_LIMIT_MINS) * 100)) : 0;

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <EmployeeSidebar />
      <div className="md:ml-64 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Flash */}
          {msg && (
            <div className="px-4 py-3 rounded-2xl text-sm font-medium"
              style={{ background: msg.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: msg.ok ? '#10b981' : '#ef4444', border: `1px solid ${msg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
              {msg.text}
            </div>
          )}

          {/* Live Session Card */}
          <div style={card} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: modeColor[workMode],  }}/>
                  <span className="text-xs font-semibold" style={{ color: modeColor[workMode] }}>
                    {workMode === 'Present' ? 'Active - Work Session' : workMode === 'Break' ? 'On Break' : workMode === 'Field' ? 'Field Visit' : 'Not Clocked In'}
                  </span>
                </div>
                <div className="text-xs" style={{ color: '#6b7280' }}>{today}</div>
              </div>
              {att?.dayStatus && att.dayStatus !== 'Absent' && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl"
                  style={{
                    background: att.dayStatus === 'Early' ? 'rgba(16,185,129,0.15)' : att.dayStatus === 'On Time' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                    color: att.dayStatus === 'Early' ? '#10b981' : att.dayStatus === 'On Time' ? '#818cf8' : '#f59e0b',
                  }}>{att.dayStatus}</span>
              )}
            </div>

            {/* Big Timer */}
            <div className="text-center my-6">
              <div className="text-5xl font-bold tracking-widest" style={{ color: modeColor[workMode], fontVariantNumeric: 'tabular-nums' }}>
                {fmtClock(elapsed)}
              </div>
              <div className="text-xs mt-2" style={{ color: '#6b7280' }}>Total Work Hours Today</div>
              {att?.checkInTime && (
                <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  Clocked in at {fmtTime(att.checkInTime)}
                </div>
              )}
            </div>

            {/* Break Info */}
            {(att?.totalBreakMins > 0 || att?.isOnBreak) && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: '#6b7280' }}>
                    Break - {BREAK_LIMIT_MINS} min allowed
                  </span>
                  <span className="text-xs font-semibold" style={{ color: breakPct >= 100 ? '#ef4444' : '#f59e0b' }}>
                    {att?.totalBreakFormatted || '0m'}
                  </span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: '#f3f4f6' }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${breakPct}%`, background: breakPct >= 100 ? '#ef4444' : '#f59e0b' }}/>
                </div>
              </div>
            )}

            {/* Geofence */}
            <div className="mb-5 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
              <div className="w-2 h-2 rounded-full bg-emerald-400"/>
              <div>
                <div className="text-xs font-semibold" style={{ color: '#10b981' }}>Geofence - Active</div>
                <div className="text-[10px]" style={{ color: '#6b7280' }}>Location verified</div>
              </div>
            </div>

            {/* Action Buttons */}
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2].map(i => <div key={i} className="h-12 rounded-2xl animate-pulse" style={{ background: '#f9fafb' }}/>)}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Not clocked in */}
                {!att?.isCheckedIn && !att?.isOnBreak && !att?.isInField && (
                  <button onClick={() => doAction('/api/attendance/checkin', {})} disabled={clocking}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>
                    {clocking ? '...' : 'Clock In'}
                  </button>
                )}

                {/* Clocked in */}
                {att?.isCheckedIn && (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => doAction('/api/attendance/checkout', { type: 'break_start' })} disabled={clocking}
                      className="py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                      Start Break
                    </button>
                    <button onClick={() => doAction('/api/attendance/checkout', {})} disabled={clocking}
                      className="py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                      Clock Out
                    </button>
                  </div>
                )}

                {/* On break */}
                {att?.isOnBreak && (
                  <button onClick={() => doAction('/api/attendance/checkin', { type: 'break_end' })} disabled={clocking}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                    End Break
                  </button>
                )}

                {/* In field */}
                {att?.isInField && (
                  <button onClick={() => doAction('/api/attendance/checkin', { type: 'field_return' })} disabled={clocking}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                    Return from Field
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Today's Timeline */}
          {att?.timeline?.length > 0 && (
            <div style={card} className="p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Today's Timeline</h2>

              {/* Shift expected */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: '#e5e7eb' }}/>
                <div>
                  <div className="text-xs font-medium" style={{ color: '#6b7280' }}>Shift expected</div>
                  <div className="text-[10px]" style={{ color: '#9ca3af' }}>10:00 AM</div>
                </div>
              </div>

              <div className="space-y-3">
                {att.timeline.map((ev: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${TIMELINE_DOT[ev.type] || 'bg-gray-500'}`}/>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-900">{ev.label}</div>
                      <div className="text-[10px]" style={{ color: '#6b7280' }}>{ev.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* March Attendance mini heatmap placeholder */}
          <div style={card} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">
                {new Date().toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' })} Attendance
              </h2>
            </div>
            <div className="text-xs" style={{ color: '#6b7280' }}>
              View full history in <button className="underline" style={{ color: '#818cf8' }} onClick={() => window.location.href = '/my-history'}>My History</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}




