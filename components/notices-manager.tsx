'use client';
import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, X, AlertTriangle, Info, Zap, Users, User } from 'lucide-react';

interface Notice {
  _id: string;
  title: string;
  message: string;
  type: 'general' | 'warning' | 'urgent';
  targetId: string | null;
  targetName: string | null;
  createdByName: string;
  isRead: boolean;
  createdAt: string;
}

interface Employee {
  _id: string;
  fullName: string;
  email: string;
  role: string;
}

const TYPE_STYLES = {
  general: { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',    icon: <Info className="w-4 h-4 text-blue-500" />,           label: 'General' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, label: 'Warning' },
  urgent:  { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',       icon: <Zap className="w-4 h-4 text-red-500" />,             label: 'Urgent'  },
};

function timeAgo(dateStr: string) {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const created = new Date(new Date(dateStr).getTime() + 5.5 * 60 * 60 * 1000);
  const diff = now.getTime() - created.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'Just now';
}

export default function NoticesManager() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'general' | 'warning' | 'urgent'>('general');
  const [targetId, setTargetId] = useState('');

  const fetchNotices = () => {
    // FIX: was /api/notices — correct is /api/notice
    fetch('/api/notice', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.notices) setNotices(d.notices); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotices();
    fetch('/api/employees', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.users) setEmployees(d.users); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      // FIX: was /api/notices — correct is /api/notice
      const r = await fetch('/api/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type, targetId: targetId || null }),
      });
      const d = await r.json();
      if (d.ok) {
        setShowForm(false);
        setTitle(''); setMessage(''); setType('general'); setTargetId('');
        fetchNotices();
      }
    } catch {}
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      // FIX: was /api/notices — correct is /api/notice
      await fetch('/api/notice', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotices(prev => prev.filter(n => n._id !== id));
    } catch {}
    setDeleting(null);
  };

  const generalCount = notices.filter(n => n.type === 'general').length;
  const warningCount = notices.filter(n => n.type === 'warning').length;
  const urgentCount  = notices.filter(n => n.type === 'urgent').length;

  return (
    <div className="bg-white rounded-3xl border border-gray-300 p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Notices & Warnings</h2>
            <p className="text-xs text-gray-700 mt-0.5">{notices.length} total · {warningCount + urgentCount} alerts</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          New Notice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'General',  count: generalCount, bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100'   },
          { label: 'Warnings', count: warningCount, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
          { label: 'Urgent',   count: urgentCount,  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100'    },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-3 text-center`}>
            <div className={`text-2xl font-bold ${s.text}`}>{s.count}</div>
            <div className="text-xs text-gray-700 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl border border-gray-200 p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">Create Notice</h3>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['general', 'warning', 'urgent'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition capitalize ${
                        type === t
                          ? t === 'general' ? 'bg-blue-500 text-white border-blue-500'
                            : t === 'warning' ? 'bg-yellow-500 text-white border-yellow-500'
                            : 'bg-red-500 text-white border-red-500'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Send To</label>
                <select value={targetId} onChange={e => setTargetId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Notice title..." required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Write your notice here..." required rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
                {submitting ? 'Sending...' : 'Send Notice'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notices list */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl"/>)}
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No notices yet</p>
          <p className="text-gray-300 text-xs mt-1">Click "New Notice" to create one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map(notice => {
            const style = TYPE_STYLES[notice.type];
            return (
              <div key={notice._id} className={`${style.bg} border ${style.border} rounded-2xl p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                          {style.label}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          {notice.targetId
                            ? <><User className="w-3 h-3"/>{notice.targetName}</>
                            : <><Users className="w-3 h-3"/>All Employees</>}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{timeAgo(notice.createdAt)}</span>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">{notice.title}</p>
                      <p className="text-gray-600 text-xs mt-1 leading-relaxed">{notice.message}</p>
                      <p className="text-gray-400 text-[10px] mt-2">By {notice.createdByName}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(notice._id)} disabled={deleting === notice._id}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}