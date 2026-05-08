'use client';
import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

interface Checkin {
  key: string;
  label: string;
  range: string;
  status: string;
}

interface SchedulePanelProps {
  checkins: Checkin[];
  loading?: boolean;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  completed: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Done' },
  in_progress: { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Active' },
  idle: { color: 'text-gray-400', bg: 'bg-gray-50', label: 'Pending' },
};

export function SchedulePanel({ checkins, loading }: SchedulePanelProps) {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-50">
        <h3 className="text-lg font-black text-gray-900 tracking-tight">Today's Check-ins</h3>
        <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">Your daily tracker windows</p>
      </div>

      <div className="p-6 space-y-2 flex-1">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-2xl animate-pulse" />
          ))
        ) : checkins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-8 w-8 text-gray-200 mb-3" />
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">No check-ins for today</p>
          </div>
        ) : (
          checkins.map((item, i) => {
            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.idle;
            return (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-2xl border transition-colors ${item.status === 'completed' ? 'bg-emerald-50/40 border-emerald-100' : 'hover:bg-gray-50 border-transparent'}`}>
                <div className={`h-10 w-10 shrink-0 ${cfg.bg} rounded-xl flex items-center justify-center`}>
                  {item.status === 'completed'
                    ? <CheckCircle2 className={`h-5 w-5 ${cfg.color}`} />
                    : <Clock className={`h-5 w-5 ${cfg.color}`} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-gray-900 truncate">{item.label}</h4>
                  <p className="text-[10px] font-medium text-gray-400">{item.range}</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
