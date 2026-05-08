'use client';
import React, { useEffect, useState } from 'react';
import Header from '@/components/header';
import EmployeeSidebar from '@/components/employee-sidebar';
import AdminSidebar from '@/components/admin-sidebar';
import { useNotifications } from '@/modules/notifications/store/NotificationContext';
import { format } from 'date-fns';
import { Bell, Check, Trash2, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d))
      .catch(() => {});
  }, []);

  const isManagement = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'hr';

  return (
    <main className="min-h-screen bg-gray-50">
      {user && (isManagement ? <AdminSidebar /> : <EmployeeSidebar />)}
      <div className={`${user ? 'md:ml-64' : ''}`}>
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
            >
              <ArrowLeft className="h-3 w-3" /> Back to previous
            </button>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">NOTIFICATION CENTER</h1>
              <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">
                Your activity stream and system alerts
              </p>
            </div>
            <button 
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || loading}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-900/10 flex items-center gap-2 disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none"
            >
              <Check className="h-4 w-4" /> Mark all as read
            </button>
          </div>

        <div className="space-y-4">
          {loading && notifications.length === 0 ? (
            <div className="bg-white p-12 rounded-[32px] border border-gray-100 text-center animate-pulse">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Synchronizing your stream...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white p-20 rounded-[32px] border border-gray-100 text-center space-y-4">
               <div className="h-16 w-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto border border-gray-100">
                  <Bell className="h-8 w-8 text-gray-200" />
               </div>
               <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Inbox Zero. You're all caught up!</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n._id}
                className={`bg-white p-6 rounded-[32px] border transition-all flex items-start gap-6 group ${
                  !n.isRead ? 'border-orange-500/30 shadow-lg shadow-orange-500/5' : 'border-gray-100'
                }`}
              >
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  !n.isRead ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}>
                  <Bell className="h-6 w-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-lg font-black tracking-tight truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                      {format(new Date(n.createdAt), 'MMM dd, yyyy · hh:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed mb-4">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center gap-4">
                    {!n.isRead && (
                      <button 
                        onClick={() => markAsRead(n._id)}
                        className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-600 transition-colors"
                      >
                        Mark as read
                      </button>
                    )}
                    {n.link && (
                      <Link 
                        href={n.link}
                        className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-1 hover:underline"
                      >
                        Action Required <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </main>
  );
}
