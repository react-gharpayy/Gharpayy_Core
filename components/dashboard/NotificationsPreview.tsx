'use client';
import React from 'react';
import { Bell, ArrowRight, Info } from 'lucide-react';
import { useNotifications } from '@/modules/notifications/store/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export function NotificationsPreview() {
  const { notifications, unreadCount, loading } = useNotifications();
  const latest = notifications.slice(0, 3);

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Latest Alerts</h3>
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">Stay updated</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="px-2 py-1 bg-orange-500 rounded-lg text-[10px] font-black text-white">
            {unreadCount} NEW
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-2 flex-1">
        {loading && latest.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-gray-400 animate-pulse uppercase">Syncing...</div>
        ) : latest.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto border border-gray-100">
              <Info className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">All caught up</p>
          </div>
        ) : (
          latest.map((n) => (
            <div key={n._id} className={`p-4 rounded-2xl border transition-all ${!n.isRead ? 'bg-orange-50/30 border-orange-100' : 'bg-gray-50/50 border-transparent hover:bg-gray-50 hover:border-gray-100'}`}>
              <div className="flex justify-between items-start mb-1 gap-2">
                <h4 className={`text-xs font-black truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</h4>
                <span className="text-[9px] font-mono font-bold text-gray-400 uppercase whitespace-nowrap">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium line-clamp-1">{n.message}</p>
            </div>
          ))
        )}
      </div>

      <Link 
        href="/notifications" 
        className="p-4 bg-gray-50/50 border-t border-gray-50 text-center text-[10px] font-black text-gray-400 hover:text-orange-500 uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2"
      >
        View All Notifications <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
