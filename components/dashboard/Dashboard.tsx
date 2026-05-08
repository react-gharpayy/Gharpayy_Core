'use client';
import React, { useState, useEffect } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { QuickActions } from './QuickActions';
import { AttendanceCard } from './AttendanceCard';
import { DailyStats } from './DailyStats';
import { ActivityFeed } from './ActivityFeed';
import { SchedulePanel } from './SchedulePanel';
import { PendingActions } from './PendingActions';
import { NotificationsPreview } from './NotificationsPreview';
import { DashboardAnalytics } from './DashboardAnalytics';
import GiveKudoModal from '@/components/GiveKudoModal';
import EmployeeSidebar from '@/components/employee-sidebar';
import SelfieCapture from '@/components/selfie-capture';
import { useToast } from '@/hooks/use-toast';
import { getISTDateStr } from '@/lib/date-utils';

function fmtClock(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [att, setAtt] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [isKudoOpen, setIsKudoOpen] = useState(false);
  const [showSelfie, setShowSelfie] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const { toast } = useToast();

  const fetchAtt = async () => {
    try {
      const res = await fetch('/api/attendance/status', { cache: 'no-store' });
      const d = await res.json();
      setAtt(d);
    } catch {}
    setAttLoading(false);
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
      const d = await res.json();
      if (d.ok) setSummary(d);
    } catch {}
    setSummaryLoading(false);
  };

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/dashboard/activity', { cache: 'no-store' });
      const d = await res.json();
      if (d.ok) setActivities(d.activities || []);
    } catch {}
    setActivityLoading(false);
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d)).catch(() => {});
    fetchAtt();
    fetchSummary();
    fetchActivity();

    const attInterval = setInterval(fetchAtt, 30000);
    const summaryInterval = setInterval(fetchSummary, 60000);
    const activityInterval = setInterval(fetchActivity, 60000);

    return () => {
      clearInterval(attInterval);
      clearInterval(summaryInterval);
      clearInterval(activityInterval);
    };
  }, []);

  const liveMins = (() => {
    if (!att) return 0;
    let mins = att.totalWorkMins || 0;
    if (att.isCheckedIn && !att.isOnBreak && att.sessions?.length > 0) {
      const last = att.sessions[att.sessions.length - 1];
      const checkInTime = last?.checkIn ? new Date(last.checkIn).getTime() : NaN;
      if (!Number.isNaN(checkInTime) && !last?.checkOut) {
        mins += Math.floor((Date.now() - checkInTime) / 60000);
      }
    }
    return mins;
  })();

  const trendWithLive = summary?.attendanceTrend?.map((t: any) => {
    if (t.date === getISTDateStr()) return { ...t, workMins: Math.max(t.workMins, liveMins) };
    return t;
  }) || [];

  const handleAction = async (endpoint: string, body: any = {}) => {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok || data.success) {
        toast({ title: 'Success', description: data.action === 'checkout' ? 'Clocked out successfully' : 'Action completed.' });
        fetchAtt();
        fetchActivity(); 
      } else {
        toast({ title: 'Error', description: data.error || 'Action failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
  };

  const handleActionWithSelfie = (endpoint: string, body: any = {}) => {
    setPendingAction({ endpoint, body });
    setShowSelfie(true);
  };

  const onSelfieCaptured = (image: string) => {
    if (!pendingAction) return;
    const { endpoint, body } = pendingAction;
    setPendingAction(null);
    setShowSelfie(false);
    handleAction(endpoint, { ...body, selfieImage: image });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <EmployeeSidebar />
      <div className="md:ml-64">
        <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 pb-24 md:pb-12">

          <DashboardHeader user={user} attendance={att} />

          <QuickActions
            attendance={att}
            onPunchToggle={() => {
              if (att?.isCheckedIn) handleActionWithSelfie('/api/attendance/checkout', { type: 'checkout' });
              else handleActionWithSelfie('/api/attendance/checkin');
            }}
            onGiveKudo={() => setIsKudoOpen(true)}
          />

          <DashboardAnalytics
            trend={trendWithLive}
            attendanceRate={summary?.stats?.attendanceRate ?? null}
            punctualityRate={summary?.stats?.punctualityRate ?? null}
            avgWorkMins={summary?.stats?.avgWorkMins ?? null}
            loading={summaryLoading}
          />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-8">
              <AttendanceCard
                status={att}
                onPunchIn={() => handleActionWithSelfie('/api/attendance/checkin')}
                onPunchOut={() => handleActionWithSelfie('/api/attendance/checkout', { type: 'checkout' })}
                onToggleBreak={() => {
                  if (att?.isOnBreak) handleActionWithSelfie('/api/attendance/checkin', { type: 'break_end' });
                  else handleAction('/api/attendance/checkout', { type: 'break_start' });
                }}
              />

              <div className="hidden xl:block">
                <DailyStats
                  taskStats={summary?.taskStats ?? null}
                  leaveStats={summary?.leaveStats ?? null}
                  attendanceRate={summary?.stats?.attendanceRate ?? null}
                  punctualityRate={summary?.stats?.punctualityRate ?? null}
                  avgWorkMins={summary?.stats?.avgWorkMins ?? null}
                  loading={summaryLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ActivityFeed activities={activities} loading={activityLoading} />
                <SchedulePanel checkins={summary?.checkins || []} loading={summaryLoading} />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <div className="xl:hidden">
                <DailyStats
                  taskStats={summary?.taskStats ?? null}
                  leaveStats={summary?.leaveStats ?? null}
                  attendanceRate={summary?.stats?.attendanceRate ?? null}
                  punctualityRate={summary?.stats?.punctualityRate ?? null}
                  avgWorkMins={summary?.stats?.avgWorkMins ?? null}
                  loading={summaryLoading}
                />
              </div>
              <PendingActions actions={summary?.pendingActions || []} loading={summaryLoading} />
              <NotificationsPreview />
            </div>
          </div>
        </div>
      </div>

      <GiveKudoModal isOpen={isKudoOpen} onClose={() => setIsKudoOpen(false)} onSuccess={fetchActivity} />
      <SelfieCapture open={showSelfie} onClose={() => setShowSelfie(false)} onCapture={onSelfieCaptured} />
    </div>
  );
}
