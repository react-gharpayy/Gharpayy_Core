'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INotification, NotificationStore } from '../types';
import { toast } from 'sonner';
import { Trophy, Star, Sparkles } from 'lucide-react';

const NotificationContext = createContext<NotificationStore | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        setNotifications(prev => {
          if (prev.find(n => n._id === notification._id)) return prev;
          return [notification, ...prev].slice(0, 50);
        });
        setUnreadCount(prev => prev + 1);

        // --- Growth/Quest Toasts ---
        if (notification.metadata?.type === 'quest_completion') {
          toast.success(notification.title, {
            description: notification.message,
            icon: <Trophy className="w-5 h-5 text-orange-500" />,
            duration: 5000
          });
        } else if (notification.metadata?.type === 'xp_gain') {
          toast(notification.title, {
            description: notification.message,
            icon: <Sparkles className="w-4 h-4 text-orange-400" />,
            duration: 3000
          });
        } else if (notification.metadata?.type === 'level_up') {
          toast.success(notification.title, {
            description: notification.message,
            icon: <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />,
            duration: 8000
          });
        } else {
          toast(notification.title, { 
            description: notification.message,
            icon: notification.type === 'URGENT' ? '🚨' : undefined
          });
        }
      } catch (err) {
        // Heartbeat or malformed data
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Connection Error:', err);
      eventSource.close();
      setTimeout(() => fetchNotifications(), 5000);
    };

    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      eventSource.close();
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      fetchNotifications, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
