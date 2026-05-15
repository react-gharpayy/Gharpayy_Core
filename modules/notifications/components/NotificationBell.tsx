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

  if (!mounted) return (
    <button className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors">
      <Bell className="h-5 w-5" />
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors group">
          <Bell className={`h-5 w-5 transition-transform ${unreadCount > 0 ? 'group-hover:scale-110' : ''}`} />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px] font-bold border-2 border-white animate-in zoom-in duration-300"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden rounded-2xl border-gray-100 shadow-2xl">
        <DropdownMenuLabel className="p-4 bg-white flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-900">Notifications</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{unreadCount} Unread</span>
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
              className="text-[9px] font-black text-orange-500 hover:text-orange-600 flex items-center gap-1 uppercase tracking-widest transition-all"
            >
              <Check className="h-3 w-3" /> Mark All Read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0 bg-gray-50" />
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Syncing Pulse...</p>
            </div>
          ) : notifications.filter(n => !n.isRead).length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Bell className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No unread notifications</p>
            </div>
          ) : (
            notifications.filter(n => !n.isRead).map((notification) => (
              <DropdownMenuItem 
                key={notification._id} 
                className={`flex flex-col items-start p-4 cursor-pointer border-b border-gray-50 last:border-0 transition-colors focus:bg-gray-50 bg-orange-50/30`}
                onSelect={() => {
                  markAsRead(notification._id);
                }}
              >
                <div className="flex w-full justify-between items-start mb-1">
                  <span className="text-[11px] font-black text-gray-900 line-clamp-1 pr-4">{notification.title}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase whitespace-nowrap">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-2 font-medium">
                  {notification.message}
                </p>
                {notification.link && (
                  <Link 
                    href={notification.link}
                    className="flex items-center gap-1.5 text-[9px] font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest transition-all"
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
