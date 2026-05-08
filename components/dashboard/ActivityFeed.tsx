'use client';
import React from 'react';
import { User, Target, Heart, CheckCircle2, Calendar, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  type: string;
  label: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  attendance: { icon: User, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  task:        { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50' },
  kudos:       { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
  leave:       { icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  kpi:         { icon: Target, color: 'text-orange-500', bg: 'bg-orange-50' },
};

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-gray-900 tracking-tight">Recent Activity</h3>
          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">Live from your workspace</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[400px] scrollbar-hide">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 border border-gray-100">
              <User className="h-6 w-6 text-gray-200" />
            </div>
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">No activity yet today</p>
          </div>
        ) : (
          activities.map((act, i) => {
            const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.attendance;
            return (
              <div key={i} className="flex gap-4 group">
                <div className={`h-10 w-10 shrink-0 ${cfg.bg} ${cfg.color} rounded-xl flex items-center justify-center`}>
                  <cfg.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 font-medium leading-snug">{act.label}</p>
                  <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
