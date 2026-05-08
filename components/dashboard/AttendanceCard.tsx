'use client';
import React from 'react';
import { 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Play, 
  Square,
  Coffee,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function fmtClock(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface AttendanceCardProps {
  status: any;
  onPunchIn: () => void;
  onPunchOut: () => void;
  onToggleBreak: () => void;
}

export function AttendanceCard({ status, onPunchIn, onPunchOut, onToggleBreak }: AttendanceCardProps) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimerValues = () => {
    if (!status) return { work: '00:00:00', break: '00:00:00' };
    let workSecs = (status.totalWorkMins || 0) * 60;
    if (status.isCheckedIn && !status.isOnBreak && status.sessions?.length > 0) {
      const last = status.sessions[status.sessions.length - 1];
      const checkInTime = last?.checkIn ? new Date(last.checkIn).getTime() : NaN;
      if (!Number.isNaN(checkInTime) && !last?.checkOut) {
        workSecs += Math.floor((Date.now() - checkInTime) / 1000);
      }
    }
    let breakSecs = (status.totalBreakMins || 0) * 60;
    if (status.isOnBreak && status.sessions?.length > 0) {
      const last = status.sessions[status.sessions.length - 1];
      const breakStartTime = last?.checkIn ? new Date(last.checkIn).getTime() : NaN;
      if (!Number.isNaN(breakStartTime) && !last?.checkOut && last?.type === 'break') {
        breakSecs += Math.floor((Date.now() - breakStartTime) / 1000);
      }
    }
    return { work: fmtClock(workSecs), break: fmtClock(breakSecs) };
  };

  const timers = getTimerValues();
  const isClockedIn = status?.isCheckedIn;
  const isOnBreak = status?.isOnBreak;
  const isInsideGeofence = status?.geofence?.isInside;

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden relative group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32 transition-all group-hover:bg-orange-500/10" />
      
      <div className="p-8 relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              <p className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">Active Work Session</p>
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {isClockedIn ? (isOnBreak ? 'Taking a Break' : 'Working Now') : 'Ready to Start?'}
            </h3>
          </div>
          <Badge variant={isInsideGeofence ? "outline" : "destructive"} className="rounded-full px-4 py-1 flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {isInsideGeofence ? 'Geofence Active' : 'Outside Zone'}
            </span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-4">
            <div className="p-6 rounded-[24px] bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Work Hours Today</p>
                <p className="text-4xl font-black text-gray-900 tracking-tighter tabular-nums mt-1">{timers.work || '00:00:00'}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <Clock className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            
            <div className="p-4 rounded-[20px] bg-orange-50/50 border border-orange-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-white shadow-xs flex items-center justify-center">
                  <Coffee className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-xs font-bold text-gray-600">Break time used</p>
              </div>
              <p className="text-sm font-black text-orange-600 font-mono">{timers.break || '00:00:00'}</p>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4">
             {!isClockedIn ? (
               <button 
                 onClick={onPunchIn}
                 className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-[24px] font-black text-lg transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3"
               >
                 <Play className="h-6 w-6 fill-white" /> PUNCH IN
               </button>
             ) : (
               <div className="space-y-3">
                 <div className="flex gap-3">
                   <button 
                     onClick={onToggleBreak}
                     className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 border ${
                       isOnBreak 
                       ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/10' 
                       : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                     }`}
                   >
                     {isOnBreak ? <Play className="h-4 w-4 fill-white" /> : <Coffee className="h-4 w-4" />}
                     {isOnBreak ? 'RESUME WORK' : 'START BREAK'}
                   </button>
                   
                   <button 
                     onClick={onPunchOut}
                     className="flex-1 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-sm transition-all hover:bg-red-500 hover:text-white flex items-center justify-center gap-2"
                   >
                     <Square className="h-4 w-4 fill-current" /> PUNCH OUT
                   </button>
                 </div>
                 
                 <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                   <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                   <p className="text-xs font-bold text-emerald-700">You are currently clocked in and active.</p>
                 </div>
               </div>
             )}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-50 flex items-center justify-between text-[10px] font-mono font-bold text-gray-300 uppercase tracking-[0.2em]">
          <span>Shift Timing: 10:00 AM – 07:00 PM</span>
          <span className="text-emerald-500">Live Syncing</span>
        </div>
      </div>
    </div>
  );
}
