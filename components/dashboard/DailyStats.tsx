'use client';
import React from 'react';
import { 
  CheckSquare, 
  Target, 
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatHHMM } from '@/lib/attendance-shared';

interface DailyStatsProps {
  taskStats: { total: number; pending: number; overdue: number; completed: number } | null;
  attendanceRate: number | null;
  punctualityRate: number | null;
  avgWorkMins: number | null;
  loading?: boolean;
}

function StatCard({ label, value, sub, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
      <div className={`h-10 w-10 ${bg} ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest leading-none">{label}</p>
        <p className="text-xl font-black text-gray-900 mt-2">{value ?? '–'}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

export function DailyStats({ taskStats, attendanceRate, punctualityRate, avgWorkMins, loading }: DailyStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const workHours = avgWorkMins != null
    ? `${formatHHMM(avgWorkMins)} avg`
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Attendance (7d)"
        value={attendanceRate != null ? `${attendanceRate}%` : null}
        sub={attendanceRate != null ? (attendanceRate >= 80 ? 'Healthy' : 'Needs attention') : 'No data yet'}
        icon={TrendingUp}
        color="text-emerald-500"
        bg="bg-emerald-50"
      />
      <StatCard
        label="Punctuality"
        value={punctualityRate != null ? `${punctualityRate}%` : null}
        sub={punctualityRate != null ? (punctualityRate >= 90 ? 'Excellent' : 'Keep improving') : 'No data yet'}
        icon={Clock}
        color="text-blue-500"
        bg="bg-blue-50"
      />
      <StatCard
        label="Tasks Pending"
        value={taskStats?.pending ?? null}
        sub={taskStats?.overdue ? `${taskStats.overdue} overdue` : `${taskStats?.completed ?? 0} completed`}
        icon={CheckSquare}
        color={taskStats?.overdue ? 'text-red-500' : 'text-orange-500'}
        bg={taskStats?.overdue ? 'bg-red-50' : 'bg-orange-50'}
      />
      <StatCard
        label="Avg Work Hours"
        value={workHours}
        sub="Last 7 present days"
        icon={Target}
        color="text-purple-500"
        bg="bg-purple-50"
      />
    </div>
  );
}
