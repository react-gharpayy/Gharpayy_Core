'use client';
import React from 'react';
import { TrendingUp, Clock, Calendar } from 'lucide-react';

interface TrendDay {
  date: string;
  present: boolean;
  onTime: boolean;
  workMins: number;
}

interface DashboardAnalyticsProps {
  trend: TrendDay[];
  attendanceRate: number | null;
  punctualityRate: number | null;
  avgWorkMins: number | null;
  loading?: boolean;
}

export function DashboardAnalytics({ trend, attendanceRate, punctualityRate, avgWorkMins, loading }: DashboardAnalyticsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm h-44 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!trend || trend.length === 0) return null;

  const avgWorkHours = avgWorkMins != null ? (avgWorkMins / 60).toFixed(1) : null;
  const maxWork = Math.max(...trend.map(d => d.workMins), 1);

  const cards = [
    {
      label: 'Attendance (7 Days)',
      value: attendanceRate != null ? `${attendanceRate}%` : '–',
      icon: Calendar,
      color: 'text-emerald-500',
      bars: trend.map(d => ({ height: d.present ? 100 : 15, active: d.present })),
      barColor: 'bg-emerald-500',
    },
    {
      label: 'Work Hours Trend',
      value: avgWorkHours ? `${avgWorkHours}h avg` : '–',
      icon: Clock,
      color: 'text-blue-500',
      bars: trend.map(d => ({ height: d.workMins > 0 ? Math.round((d.workMins / maxWork) * 100) : 5, active: d.workMins > 0 })),
      barColor: 'bg-blue-500',
    },
    {
      label: 'Punctuality (7 Days)',
      value: punctualityRate != null ? `${punctualityRate}%` : '–',
      icon: TrendingUp,
      color: 'text-orange-500',
      bars: trend.map(d => ({ height: d.present ? (d.onTime ? 100 : 40) : 10, active: d.onTime })),
      barColor: 'bg-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card, i) => (
        <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className={`h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{card.value}</p>
          </div>
          <div className="flex items-end gap-1 h-10">
            {card.bars.map((bar, j) => (
              <div
                key={j}
                className={`flex-1 rounded-t-sm transition-all duration-500 ${card.barColor}`}
                style={{ height: `${bar.height}%`, opacity: bar.active ? 0.85 : 0.2 }}
                title={trend[j]?.date}
              />
            ))}
          </div>
          <p className="text-[9px] font-mono text-gray-300 uppercase tracking-widest">Last 7 days · Real data</p>
        </div>
      ))}
    </div>
  );
}
