'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Users, Globe, Building2, Loader2, ChevronLeft, ChevronRight, Coins, Flame } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardRow } from '@/modules/growth/components/LeaderboardRow';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import GrowthLayoutWrapper from '@/modules/growth/components/GrowthLayoutWrapper';

export default function LeaderboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('xp');
  const [scope, setScope] = useState('org');
  const [page, setPage] = useState(1);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/growth/leaderboard?type=${type}&scope=${scope}&page=${page}&limit=20`);
      const d = await r.json();
      if (d.ok) setData(d);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [type, scope, page]);

  const top3 = data?.leaderboard?.slice(0, 3) || [];
  const others = data?.leaderboard?.slice(3) || [];

  return (
    <GrowthLayoutWrapper>
      <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Arena Hall of Fame
          </h1>
          <p className="text-gray-500 font-medium">The top performers driving Gharpayy forward.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={type} onValueChange={(v) => { setType(v); setPage(1); }} className="w-full md:w-auto">
            <TabsList className="bg-gray-100 p-1 rounded-2xl h-12">
              <TabsTrigger value="xp" className="rounded-xl font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-orange-600 shadow-none border-none">
                <Trophy className="w-4 h-4 mr-2" />
                XP
              </TabsTrigger>
              <TabsTrigger value="coins" className="rounded-xl font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-orange-600 shadow-none border-none">
                <Coins className="w-4 h-4 mr-2" />
                Coins
              </TabsTrigger>
              <TabsTrigger value="streak" className="rounded-xl font-bold px-4 data-[state=active]:bg-white data-[state=active]:text-orange-600 shadow-none border-none">
                <Flame className="w-4 h-4 mr-2" />
                Streaks
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Scope:</div>
            <Select value={scope} onValueChange={(v) => { setScope(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] rounded-xl border-gray-200 bg-white font-bold text-sm h-11 focus:ring-orange-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                <SelectItem value="org" className="font-medium focus:bg-orange-50 focus:text-orange-600">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    Organization
                  </div>
                </SelectItem>
                <SelectItem value="team" className="font-medium focus:bg-orange-50 focus:text-orange-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    My Team
                  </div>
                </SelectItem>
                <SelectItem value="hub" className="font-medium focus:bg-orange-50 focus:text-orange-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Hub / Zone
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-medium text-gray-500">Calculating rankings...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Podium for Top 3 */}
          {page === 1 && top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-10 pb-4">
              {/* Rank 2 */}
              {top3[1] && (
                <div className="order-2 md:order-1">
                   <div className="flex flex-col items-center gap-3 group">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                          {top3[1].photo ? <img src={top3[1].photo} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-gray-400">#2</span>}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-black shadow-md border-2 border-white">2nd</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 truncate w-32">{top3[1].name}</div>
                        <div className="text-xs font-black text-gray-400">{top3[1].value.toLocaleString()}</div>
                      </div>
                      <div className="w-full h-24 bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-3xl shadow-inner mt-2 flex items-center justify-center">
                         <Medal className="w-8 h-8 text-gray-300" />
                      </div>
                   </div>
                </div>
              )}

              {/* Rank 1 */}
              {top3[0] && (
                <div className="order-1 md:order-2">
                   <div className="flex flex-col items-center gap-3 group -mt-8">
                      <div className="relative">
                        <div className="w-28 h-28 rounded-full border-4 border-yellow-400 bg-yellow-50 flex items-center justify-center overflow-hidden shadow-2xl group-hover:scale-105 transition-transform ring-4 ring-yellow-400/20">
                          {top3[0].photo ? <img src={top3[0].photo} className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-yellow-500">#1</span>}
                        </div>
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-lg animate-bounce" />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-md border-2 border-white">WINNER</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base font-black text-gray-900 truncate w-40">{top3[0].name}</div>
                        <div className="flex items-center justify-center gap-1.5 text-sm font-black text-orange-600">
                          {type === 'coins' && <Coins className="w-4 h-4 text-yellow-500" />}
                          {type === 'xp' && <Trophy className="w-4 h-4 text-orange-500" />}
                          {type === 'streak' && <Flame className="w-4 h-4 text-orange-600" />}
                          <span>{top3[0].value.toLocaleString()}</span>
                          <span className="text-[10px] uppercase">{type}</span>
                        </div>
                      </div>
                      <div className="w-full h-32 bg-gradient-to-t from-yellow-200 to-yellow-50 rounded-t-3xl shadow-inner mt-2 flex items-center justify-center border-t-2 border-yellow-300/30">
                         <Trophy className="w-10 h-10 text-yellow-400/50" />
                      </div>
                   </div>
                </div>
              )}

              {/* Rank 3 */}
              {top3[2] && (
                <div className="order-3 md:order-3">
                   <div className="flex flex-col items-center gap-3 group">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-amber-500/30 bg-amber-50 flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                          {top3[2].photo ? <img src={top3[2].photo} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-amber-600">#3</span>}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-md border-2 border-white">3rd</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 truncate w-32">{top3[2].name}</div>
                        <div className="text-xs font-black text-gray-400">{top3[2].value.toLocaleString()}</div>
                      </div>
                      <div className="w-full h-20 bg-gradient-to-t from-amber-200/50 to-amber-50 rounded-t-3xl shadow-inner mt-2 flex items-center justify-center">
                         <Medal className="w-8 h-8 text-amber-200" />
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard List */}
          <div className="space-y-2">
            {others.map((row: any) => (
              <LeaderboardRow 
                key={row.userId}
                rank={row.rank}
                name={row.name}
                photo={row.photo}
                team={row.team}
                role={row.role}
                value={row.value}
                level={row.level}
                isCurrentUser={row.userId === data?.currentUserId || row.rank === data?.userRank}
                metricLabel={type.toUpperCase()}
              />
            ))}

            {data?.leaderboard?.length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                <p className="text-gray-500 font-medium">No rankings found for this scope.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data?.total > 20 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl font-bold h-11 border-gray-200"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm font-bold text-gray-600">
                Page {page} of {Math.ceil(data.total / 20)}
              </div>
              <Button 
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(data.total / 20)}
                className="rounded-xl font-bold h-11 border-gray-200"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Sticky User Rank */}
      {data?.userRank && (
        <div className="sticky bottom-24 md:bottom-8 z-20">
          <div className="bg-orange-600 text-white rounded-2xl p-4 shadow-xl shadow-orange-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-lg">
                {data.userRank}
              </div>
              <div>
                <div className="text-xs font-bold text-white/70 uppercase tracking-widest">Your Current Position</div>
                <div className="text-sm font-black">Keep it up! You're in the top {Math.round((data.userRank / data.total) * 100)}%</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 font-bold"
              onClick={() => {
                const targetPage = Math.ceil(data.userRank / 20);
                if (targetPage !== page) {
                  setPage(targetPage);
                }
              }}
            >
              Find Me
            </Button>
          </div>
        </div>
      )}
    </div>
    </GrowthLayoutWrapper>
  );
}
