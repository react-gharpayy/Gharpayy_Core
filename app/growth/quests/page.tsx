'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Calendar, Target, Loader2, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestCard } from '@/modules/growth/components/QuestCard';
import { toast } from 'sonner';
import GrowthLayoutWrapper from '@/modules/growth/components/GrowthLayoutWrapper';
import { useNotifications } from '@/modules/notifications/store/NotificationContext';
import { useRouter } from 'next/navigation';

export default function QuestsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { notifications } = useNotifications();

  const fetchQuests = async () => {
    try {
      const r = await fetch('/api/growth/quests');
      const d = await r.json();
      if (d.ok) {
        if (d.isAdmin) {
          router.push('/growth/admin/analytics');
          return;
        }
        setData(d);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load quests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      const last = notifications[0];
      if (last.metadata?.type === 'quest_completion' || last.metadata?.type === 'xp_gain') {
        fetchQuests();
      }
    }
  }, [notifications]);

  const handleClaim = async (questId: string) => {
    setClaimingId(questId);
    try {
      const r = await fetch('/api/growth/quests/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId })
      });
      const d = await r.json();
      if (d.ok) {
        toast.success(`Claimed ${d.reward.xp} XP and ${d.reward.coins} Coins!`, {
          description: d.reward.leveledUp ? `Level Up! You reached Level ${d.reward.newLevel}!` : undefined,
          icon: <Sparkles className="w-5 h-5 text-orange-500" />
        });
        // Refresh data
        fetchQuests();
      } else {
        toast.error(d.error || "Claim failed");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <GrowthLayoutWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-medium text-gray-500">Loading missions...</p>
        </div>
      </GrowthLayoutWrapper>
    );
  }

  return (
    <GrowthLayoutWrapper>
      <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Growth Missions</h1>
          <p className="text-gray-500 font-medium">Complete tasks, earn XP, and climb the ranks.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white border border-gray-200 px-4 py-2.5 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Today's Cycle</div>
            <div className="text-sm font-bold text-gray-900">{data?.periods?.today}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md bg-gray-100 p-1 rounded-2xl h-12">
          <TabsTrigger value="daily" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all">
            <Calendar className="w-4 h-4 mr-2" />
            Daily Quests
          </TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all">
            <Target className="w-4 h-4 mr-2" />
            Weekly Challenges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.quests?.daily?.map((q: any) => (
              <QuestCard 
                key={q._id || q.id} 
                quest={q} 
                onClaim={handleClaim} 
                isClaiming={claimingId === q.id} 
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.quests?.weekly?.map((q: any) => (
              <QuestCard 
                key={q._id || q.id} 
                quest={q} 
                onClaim={handleClaim} 
                isClaiming={claimingId === q.id} 
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info panel */}
      <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-8 h-8 text-orange-600" />
        </div>
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-lg font-bold text-orange-900">Consistency is Key</h3>
          <p className="text-sm text-orange-800/70 leading-relaxed">
            Missions reset automatically. Complete your daily quests before midnight to maintain your streak and maximize coin earnings.
          </p>
        </div>
      </div>
      </div>
    </GrowthLayoutWrapper>
  );
}
