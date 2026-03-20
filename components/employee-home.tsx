'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Clock, CheckCircle, XCircle, MapPin } from 'lucide-react';
import NoticesEmployee from '@/components/notices-employee';

interface User { id: string; email: string; fullName: string; role: string; }

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function fmtMins(m: number) {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function EmployeeHome({ user }: { user: User }) {
  const router = useRouter();
  const [att, setAtt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchStatus = () => {
    setLoading(true);
    fetch('/api/attendance/status', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setAtt(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStatus(); }, []);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 5000);
  };

  const doCheckIn = () => {
    // Prevent double click
    if (clocking || att?.isCheckedIn) return;
    setClocking(true);
    flash('Getting your location...', true);

    if (!navigator.geolocation) {
      doCheckInCoords(null, null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => doCheckInCoords(pos.coords.latitude, pos.coords.longitude),
      () => doCheckInCoords(null, null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const doCheckInCoords = async (lat: number | null, lng: number | null) => {
    try {
      const r = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const d = await r.json();
      if (d.ok) {
        flash(`✅ Checked in successfully! You are ${d.dayStatus}.`, true);
        fetchStatus();
      } else {
        if (d.error === 'Already checked in') {
          flash('You are already checked in.', false);
        } else {
          flash(d.error || 'Check-in failed. Try again.', false);
        }
      }
    } catch {
      flash('Network error. Check your internet and try again.', false);
    }
    setClocking(false);
  };

  const doCheckOut = async () => {
    // Prevent checkout if not checked in
    if (clocking || !att?.isCheckedIn) return;
    setClocking(true);
    try {
      const r = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const d = await r.json();
      if (d.ok) {
        flash(`✅ Checked out! You worked ${fmtMins(d.totalWorkMins)} today.`, true);
        fetchStatus();
      } else {
        if (d.error === 'Not checked in') {
          flash('You have not checked in yet today.', false);
        } else {
          flash(d.error || 'Check-out failed. Try again.', false);
        }
      }
    } catch {
      flash('Network error. Check your internet and try again.', false);
    }
    setClocking(false);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isIn = att?.isCheckedIn;
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // Determine clear status text
  const statusText = () => {
    if (loading) return null;
    if (isIn) {
      const time = att?.firstCheckIn ? fmtTime(att.firstCheckIn) : '--';
      return { dot: 'bg-green-500', color: 'text-green-700', text: `● Checked In at ${time}` };
    }
    if (att?.sessions > 0) {
      const time = att?.checkOutTime
        ? fmtTime(att.checkOutTime)
        : att?.firstCheckIn ? fmtTime(att.firstCheckIn) : '--';
      return { dot: 'bg-gray-400', color: 'text-gray-600', text: `✓ Checked Out · Worked ${att.totalWorkFormatted}` };
    }
    return { dot: 'bg-red-400', color: 'text-gray-500', text: '● Not Checked In' };
  };

  const status = statusText();

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-lg font-bold text-orange-500">Gharpayy</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 border border-gray-200 rounded-lg px-3 py-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Hi, {user.fullName.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{today}</p>
        </div>

        {/* MAIN ATTENDANCE CARD */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Gradient banner */}
          <div className="h-36 flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a1a6e 0%, #2d2d9f 50%, #6b6bdd 100%)' }}>
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }}/>
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{initials(user.fullName)}</span>
              </div>
              <div className="text-center">
                <div className="text-white font-semibold text-base">{user.fullName}</div>
                <div className="text-white/60 text-xs capitalize">{user.role}</div>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* ── CLEAR STATUS INDICATOR ── */}
            <div className={`rounded-2xl px-4 py-3 border ${
              loading ? 'bg-gray-50 border-gray-100' :
              isIn ? 'bg-green-50 border-green-200' :
              att?.sessions > 0 ? 'bg-gray-50 border-gray-200' :
              'bg-red-50 border-red-100'
            }`}>
              {loading ? (
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"/>
              ) : (
                <p className={`text-sm font-semibold ${status?.color}`}>
                  {status?.text}
                </p>
              )}
            </div>

            {/* Stats — shown only after first check-in */}
            {!loading && att?.sessions > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'First In',  value: att.firstCheckIn ? fmtTime(att.firstCheckIn) : '--' },
                  { label: 'Sessions',  value: String(att.sessions) },
                  { label: 'Worked',    value: att.totalWorkFormatted },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</div>
                    <div className="text-sm font-bold text-gray-800">{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── CLOCK IN / OUT BUTTON ── */}
            {loading ? (
              <div className="h-14 bg-gray-100 rounded-2xl animate-pulse"/>
            ) : isIn ? (
              <button
                onClick={doCheckOut}
                disabled={clocking}
                className="w-full py-4 rounded-2xl font-bold text-base bg-white text-orange-500 border-2 border-orange-500 hover:bg-orange-50 active:scale-[0.98] transition disabled:opacity-60 shadow-sm"
              >
                {clocking ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Processing...
                  </span>
                ) : 'Clock Out'}
              </button>
            ) : (
              <button
                onClick={doCheckIn}
                disabled={clocking}
                className="w-full py-4 rounded-2xl font-bold text-base bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] transition disabled:opacity-60 shadow-sm"
              >
                {clocking ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Getting location...
                  </span>
                ) : att?.sessions > 0 ? 'Clock In Again' : 'Clock In'}
              </button>
            )}

            {/* GPS hint */}
            {!loading && (
              <div className="flex items-center justify-center gap-1.5">
                <MapPin className="w-3 h-3 text-gray-400"/>
                <p className="text-xs text-gray-400 text-center">
                  {isIn
                    ? 'Tap Clock Out when you leave for the day'
                    : 'Location will be captured automatically'}
                </p>
              </div>
            )}

            {/* ── FLASH MESSAGE ── */}
            {msg && (
              <div className={`flex items-start gap-2 p-3.5 rounded-2xl text-sm font-medium border ${
                msg.ok
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {msg.ok
                  ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600"/>
                  : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500"/>}
                <span>{msg.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* TODAY'S TIMELINE */}
        {!loading && att?.timeline && att.timeline.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-orange-500"/>
              <h3 className="font-bold text-gray-800 text-sm">Today's Timeline</h3>
            </div>
            <div className="space-y-2">
              {att.timeline.map((ev: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
                  ev.type === 'checkin' ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
                }`}>
                  {ev.type === 'checkin'
                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0"/>
                    : <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
                  <span className="text-sm text-gray-700 flex-1">{ev.label}</span>
                  <span className="text-xs text-gray-400 font-medium">{ev.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NOTICES */}
        <NoticesEmployee />

      </div>
    </div>
  );
}
