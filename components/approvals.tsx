'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, MapPin, User } from 'lucide-react';

interface Exception {
  _id: string; employeeName: string; type: string;
  date: string; reason: string; requestedTime: string | null;
  status: string; createdAt: string;
}

const TYPE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  missed_punch:  { label: 'Missed Punch',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  break_overrun: { label: 'Break Overrun', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  manual_entry:  { label: 'Manual Entry',  color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  geo_failure:   { label: 'Geo Failure',   color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  early_exit:    { label: 'Early Exit',    color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
};

const AVATAR_COLORS = ['#f97316','#6366f1','#10b981','#a855f7','#f59e0b','#ef4444'];
function avColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 6; return AVATAR_COLORS[h]; }
function initials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase(); }
function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`; if (m > 0) return `${m}m ago`; return 'Just now';
}

export default function Approvals() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchData = (status = tab) => {
    setLoading(true);
    fetch(`/api/exceptions?status=${status}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.exceptions) setExceptions(d.exceptions);
        if (status === 'pending' && d.pendingCount !== undefined) setPendingCount(d.pendingCount);
      })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const act = async (id: string, status: 'approved' | 'rejected') => {
    setActing(id);
    try {
      await fetch('/api/exceptions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exceptionId: id, status }) });
      fetchData(tab);
    } catch {} setActing(null);
  };

  const switchTab = (t: 'pending' | 'approved' | 'rejected') => { setTab(t); fetchData(t); };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
              Exception requests from employees
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="text-sm font-bold px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected'] as const).map(t => (
            <button key={t} onClick={() => switchTab(t)}
              className="px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: tab === t ? 'rgba(249,115,22,0.15)' : '#f9fafb',
                color: tab === t ? '#f97316' : '#6b7280',
                border: `1px solid ${tab === t ? 'rgba(249,115,22,0.3)' : 'transparent'}`,
              }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={card} className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl" style={{ background: '#f9fafb' }}/>)}
          </div>
        ) : exceptions.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }}/>
            <div className="text-sm font-semibold text-gray-900">All clear</div>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>No {tab} requests</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f9fafb' }}>
            {exceptions.map(exc => {
              const tc = TYPE_LABEL[exc.type] || { label: exc.type, color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
              return (
                <div key={exc._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: avColor(exc.employeeName), color: '#fff' }}>
                      {initials(exc.employeeName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-900">{exc.employeeName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                        <span className="text-[10px] ml-auto" style={{ color: '#6b7280' }}>{timeAgo(exc.createdAt)}</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{exc.reason}</p>
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: '#6b7280' }}>
                        <span>{exc.date}</span>
                        {exc.requestedTime && <span>Requested: {exc.requestedTime}</span>}
                      </div>

                      {exc.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => act(exc._id, 'approved')} disabled={acting === exc._id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <CheckCircle2 className="w-3.5 h-3.5"/>Approve
                          </button>
                          <button onClick={() => act(exc._id, 'rejected')} disabled={acting === exc._id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <XCircle className="w-3.5 h-3.5"/>Reject
                          </button>
                        </div>
                      )}

                      {exc.status !== 'pending' && (
                        <div className="mt-2 text-xs font-semibold" style={{ color: exc.status === 'approved' ? '#10b981' : '#ef4444' }}>
                          {exc.status === 'approved' ? 'Approved' : 'Rejected'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}



