'use client';
import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, X, Users, User, Zap, AlertTriangle, Info } from 'lucide-react';

interface Notice {
  _id: string; title: string; message: string;
  type: 'general' | 'warning' | 'urgent';
  targetId: string | null; targetName: string | null;
  createdByName: string; readBy: string[]; createdAt: string;
}
interface Employee { _id: string; fullName: string; }

const TYPE_CONFIG = {
  general: { icon: Info,          color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)',  label: 'General'  },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Warning' },
  urgent:  { icon: Zap,           color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  label: 'Urgent'  },
};

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`; if (m > 0) return `${m}m ago`; return 'Just now';
}

export default function NoticesPage({ isAdmin = true }: { isAdmin?: boolean }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', message: '', type: 'general' as 'general'|'warning'|'urgent', targetId: '' });
  const [userId, setUserId] = useState('');

  const fetchNotices = () => {
    setLoading(true);
    fetch('/api/notice', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.notices) setNotices(d.notices); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotices();
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.id) setUserId(d.id); }).catch(() => {});
    if (isAdmin) fetch('/api/employees').then(r => r.json()).then(d => { if (d.users) setEmployees(d.users); }).catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.title || !form.message) return;
    setSubmitting(true);
    try {
      const r = await fetch('/api/notice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, targetId: form.targetId || null }) });
      const d = await r.json();
      if (d.ok) { setShowForm(false); setForm({ title: '', message: '', type: 'general', targetId: '' }); fetchNotices(); }
    } catch {} setSubmitting(false);
  };

  const del = async (id: string) => {
    setDeleting(id);
    try {
      await fetch('/api/notice', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setNotices(p => p.filter(n => n._id !== id));
    } catch {} setDeleting(null);
  };

  const markRead = async (id: string) => {
    try { await fetch('/api/notice/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noticeId: id }) }); } catch {}
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
  const counts = { general: notices.filter(n => n.type === 'general').length, warning: notices.filter(n => n.type === 'warning').length, urgent: notices.filter(n => n.type === 'urgent').length };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {notices.length} total · {counts.warning + counts.urgent} alerts
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff' }}>
              <Plus className="w-4 h-4"/> Publish Notice
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <div key={type} className="p-3 rounded-xl text-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <div className="text-xl font-bold" style={{ color: cfg.color }}>{counts[type as keyof typeof counts]}</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>{cfg.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={card} className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl" style={{ background: '#f9fafb' }}/>)}
          </div>
        ) : notices.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }}/>
            <div className="text-sm text-gray-900 font-semibold">No notices yet</div>
            {isAdmin && <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Click "Publish Notice" to create one</div>}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f9fafb' }}>
            {notices.map(n => {
              const cfg = TYPE_CONFIG[n.type];
              const Icon = cfg.icon;
              const isUnread = !n.readBy?.includes(userId);
              return (
                <div key={n._id} className="p-4 transition hover:bg-gray-50" onClick={() => isUnread && markRead(n._id)}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span className="text-[10px] flex items-center gap-1" style={{ color: '#6b7280' }}>
                          {n.targetId ? <><User className="w-3 h-3"/>{n.targetName}</> : <><Users className="w-3 h-3"/>All</>}
                        </span>
                        <span className="text-[10px] ml-auto" style={{ color: '#9ca3af' }}>{timeAgo(n.createdAt)}</span>
                        {isUnread && !isAdmin && (
                          <div className="w-2 h-2 rounded-full" style={{ background: '#f97316' }}/>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">{n.title}</div>
                      <div className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{n.message}</div>
                      <div className="text-[10px] mt-2" style={{ color: '#9ca3af' }}>
                        By {n.createdByName} · {n.readBy?.length || 0} read
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => del(n._id)} disabled={deleting === n._id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition hover:bg-gray-100 disabled:opacity-40"
                        style={{ color: '#9ca3af' }}>
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-3xl p-6" style={{ background: '#ffffff', border: '1px solid #d1d5db' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Publish Notice</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition" style={{ color: '#6b7280' }}><X className="w-4 h-4"/></button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(Object.entries(TYPE_CONFIG) as any).map(([type, cfg]: any) => (
                <button key={type} onClick={() => setForm(p => ({ ...p, type }))}
                  className="py-2.5 rounded-xl text-xs font-bold capitalize transition-all"
                  style={{
                    background: form.type === type ? cfg.bg : '#f9fafb',
                    color: form.type === type ? cfg.color : '#6b7280',
                    border: `1px solid ${form.type === type ? cfg.border : 'transparent'}`,
                  }}>{cfg.label}</button>
              ))}
            </div>

            <div className="space-y-3">
              <select value={form.targetId} onChange={e => setForm(p => ({ ...p, targetId: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151' }}>
                <option value="">All Employees</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.fullName}</option>)}
              </select>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title *"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none text-gray-700 placeholder-gray-400"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }} />
              <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Message *" rows={4}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none text-gray-700 placeholder-gray-400 resize-none"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }} />
              <button onClick={submit} disabled={submitting || !form.title || !form.message}
                className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff' }}>
                {submitting ? 'Publishing...' : 'Publish Notice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


