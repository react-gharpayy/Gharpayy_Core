'use client';
import React from 'react';
import { Bell, Check, ExternalLink, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '../store/NotificationContext';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors group">
        <Bell className="h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
      </button>
    );
  }

  const displayNotifications = notifications.slice(0, 10);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors group">
          <Bell className="h-5 w-5 text-gray-600 group-hover:text-orange-500 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-0 shadow-xl border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50/50 flex justify-between items-center border-b border-gray-100">
          <div>
            <DropdownMenuLabel className="p-0 font-black text-gray-900">Notifications</DropdownMenuLabel>
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {unreadCount} Unread
            </p>
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
              className="text-[10px] font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-gray-400 animate-pulse">
              SYNCING NOTIFICATIONS...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto border border-gray-100">
                <Info className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">No notifications yet</p>
            </div>
          ) : (
            displayNotifications.map((n) => (
              <DropdownMenuItem 
                key={n._id}
                className={`p-4 cursor-pointer focus:bg-gray-50 flex flex-col items-start gap-1 border-b border-gray-50 last:border-0 transition-colors ${!n.isRead ? 'bg-orange-50/30' : ''}`}
                onSelect={(e) => {
                  e.preventDefault();
                  if (!n.isRead) markAsRead(n._id);
                }}
              >
                <div className="flex justify-between items-start w-full gap-2">
                  <span className={`text-[11px] font-black leading-tight ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                    {n.title}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-gray-400 uppercase whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed line-clamp-2">
                  {n.message}
                </p>
                {n.link && (
                  <Link 
                    href={n.link}
                    className="mt-2 flex items-center gap-1 text-[9px] font-black text-orange-500 uppercase tracking-widest hover:underline"
                  >
                    View Details <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>

        <Link 
          href="/notifications" 
          className="block p-3 text-center text-[10px] font-black text-gray-400 hover:text-gray-900 bg-gray-50/50 hover:bg-gray-100/50 uppercase tracking-widest transition-all border-t border-gray-100"
        >
          View All Activity
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
