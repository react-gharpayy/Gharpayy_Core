'use client';
import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface DashboardHeaderProps {
  user: any;
  attendance: any;
}

export function DashboardHeader({ user, attendance }: DashboardHeaderProps) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000); // Update every minute is enough for header
    return () => clearInterval(timer);
  }, []);

  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  if (hour >= 17) greeting = 'Good evening';

  const today = format(new Date(), 'EEEE, MMMM do');

  const isClockedIn = attendance?.isCheckedIn;
  const isOnBreak = attendance?.isOnBreak;

  const getLiveWorkMins = () => {
    if (!attendance) return 0;
    let mins = attendance.totalWorkMins || 0;
    // If clocked in and not on break, add duration of current session
    if (isClockedIn && !isOnBreak && attendance.sessions?.length > 0) {
      const last = attendance.sessions[attendance.sessions.length - 1];
      const checkInTime = last?.checkIn ? new Date(last.checkIn).getTime() : NaN;
      if (!Number.isNaN(checkInTime) && !last?.checkOut) {
        mins += Math.floor((Date.now() - checkInTime) / 60000);
      }
    }
    return mins;
  };

  const liveWorkMins = getLiveWorkMins();

  const statusLabel = isClockedIn
    ? isOnBreak ? 'On Break' : 'Clocked In & Active'
    : 'Not Clocked In';

  const statusColor = isClockedIn
    ? isOnBreak ? 'bg-orange-500' : 'bg-emerald-500'
    : 'bg-gray-300';

  const role = user?.playbookRole || user?.role || 'employee';

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-2">
          {greeting}, {user?.fullName?.split(' ')[0] || '…'}.
          <Sparkles className="h-6 w-6 text-orange-500 fill-orange-500" />
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-medium text-gray-500">{today}</p>
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-orange-200 text-orange-600 bg-orange-50">
            {role}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest leading-none">Session Status</p>
          <p className="text-sm font-black text-gray-900 mt-1">{statusLabel}</p>
        </div>
        <div className={`h-10 w-1 rounded-full ${statusColor}`} />
        {attendance != null ? (
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest leading-none">Work Today</p>
            <p className="text-sm font-black text-gray-900">
              {Math.floor(liveWorkMins / 60)}h {liveWorkMins % 60}m
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest leading-none">Work Today</p>
            <p className="text-sm font-black text-gray-400">–</p>
          </div>
        )}
      </div>
    </div>
  );
}
