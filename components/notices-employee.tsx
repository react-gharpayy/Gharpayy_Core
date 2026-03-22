'use client';
import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Info, Zap, ChevronDown, ChevronUp } from 'lucide-react';

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

const TYPE_STYLES = {
  general: {
    bg: 'bg-blue-50', border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    icon: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
    label: 'Notice',
  },
  warning: {
    bg: 'bg-yellow-50', border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />,
    label: 'Warning',
  },
  urgent: {
    bg: 'bg-red-50', border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: <Zap className="w-4 h-4 text-red-500 flex-shrink-0" />,
    label: 'Urgent',
  },
};

function timeAgo(dateStr: string) {
  // IST-aware time ago
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

export default function NoticesEmployee() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // FIXED: was /api/notices (wrong) — correct route is /api/notice
    fetch('/api/notice', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.notices) setNotices(d.notices);
        if (d.unreadCount !== undefined) setUnreadCount(d.unreadCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    setNotices(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await fetch('/api/notice/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const toggleExpand = (id: string, isRead: boolean) => {
    setExpanded(prev => prev === id ? null : id);
    if (!isRead) markRead(id);
  };

  const displayed = showAll ? notices : notices.slice(0, 3);
  const hasUrgentOrWarning = notices.some(n => !n.isRead && (n.type === 'urgent' || n.type === 'warning'));

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-5 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/3 mb-3"/>
        <div className="space-y-2">
          {[1,2].map(i => <div key={i} className="h-14 bg-gray-50 rounded-2xl"/>)}
        </div>
      </div>
    );
  }

  if (notices.length === 0) return null;

  return (
    <div className={`rounded-3xl border p-5 ${hasUrgentOrWarning ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className={`w-5 h-5 ${hasUrgentOrWarning ? 'text-red-500' : 'text-orange-500'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="font-semibold text-gray-800 text-sm">
            Notices
            {unreadCount > 0 && (
              <span className="ml-2 text-xs font-normal text-red-500">{unreadCount} unread</span>
            )}
          </span>
        </div>
        {notices.length > 3 && (
          <button
            onClick={() => setShowAll(p => !p)}
            className="text-xs text-orange-500 font-medium flex items-center gap-1"
          >
            {showAll ? <><ChevronUp className="w-3 h-3"/>Less</> : <><ChevronDown className="w-3 h-3"/>View all {notices.length}</>}
          </button>
        )}
      </div>

      {/* Notices */}
      <div className="space-y-2">
        {displayed.map(notice => {
          const style = TYPE_STYLES[notice.type];
          const isOpen = expanded === notice._id;
          return (
            <div
              key={notice._id}
              className={`rounded-2xl border transition cursor-pointer ${style.bg} ${style.border} ${!notice.isRead ? 'ring-2 ring-offset-1 ring-orange-300' : ''}`}
              onClick={() => toggleExpand(notice._id, notice.isRead)}
            >
              <div className="flex items-center gap-3 p-3">
                {style.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                      {style.label}
                    </span>
                    {!notice.isRead && (
                      <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"/>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(notice.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{notice.title}</p>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
              </div>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-current border-opacity-10">
                  <p className="text-sm text-gray-700 leading-relaxed">{notice.message}</p>
                  <p className="text-[10px] text-gray-400 mt-2">Posted by {notice.createdByName}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
