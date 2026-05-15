'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart3, Coins, Zap, ShoppingBag, 
  AlertTriangle, Loader2, TrendingUp, Users,
  CheckCircle2, ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer,
  Cell
} from 'recharts';

export default function GrowthAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/growth/admin/analytics');
      const d = await r.json();
      if (d.ok) setData(d.summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-gray-500 font-medium">Crunching the numbers...</p>
      </div>
    );
  }

  if (!data) return null;

  // Prepare chart data with fallbacks
  const chartData = data.activity.xpHistory.map((h: any) => ({
    date: h._id.split('-').slice(1).join('/'),
    xp: h.totalXP
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-orange-500" />
          Economy Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">Lightweight operational overview of the Growth Engine ecosystem.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-orange-50/50 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Circulating Coins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-black text-gray-900">{data.economy.totalCoins.toLocaleString()}</div>
              <Coins className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Avg. {data.economy.avgCoins} per user</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-indigo-50/50 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Quest Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-black text-gray-900">{data.activity.totalClaims}</div>
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">From {data.activity.activeProgress} active attempts (7d)</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-green-50/50 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Active Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-black text-gray-900">{data.economy.activeUsers}</div>
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Enrolled in Growth Engine</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-purple-50/50 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">XP Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-black text-gray-900">
                {Math.round(data.activity.xpHistory.reduce((s:any, h:any) => s + h.totalXP, 0) / 7).toLocaleString()}
              </div>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Avg. XP awarded per day (7d)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP History Chart (Recharts Implementation) */}
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4 px-6">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
              <Zap className="w-4 h-4 text-yellow-500 fill-yellow-50" /> XP Trend (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1">
             {chartData.length === 0 ? (
               <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2 border border-dashed border-gray-100 rounded-2xl">
                 <TrendingUp className="w-8 h-8 opacity-20" />
                 <p className="text-xs font-medium uppercase tracking-widest">No activity data</p>
               </div>
             ) : (
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                      />
                      <RechartsTooltip 
                        cursor={{fill: '#fff7ed'}}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: '900', fontSize: '12px', color: '#f97316' }}
                        itemStyle={{ fontWeight: 'bold', fontSize: '11px' }}
                      />
                      <Bar 
                        dataKey="xp" 
                        fill="#f97316" 
                        radius={[8, 8, 0, 0]} 
                        barSize={32}
                      >
                         {chartData.map((entry: any, index: number) => (
                           <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#ea580c' : '#f97316'} />
                         ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               </div>
             )}
          </CardContent>
        </Card>

        {/* Redemption Status */}
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4 px-6">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-500" /> Redemption Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
             <div className="divide-y divide-gray-100 min-h-[256px]">
                {data.redemptions.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-sm text-gray-400 gap-2">
                    <ShoppingBag className="w-8 h-8 opacity-20" />
                    <p>No redemptions this week.</p>
                  </div>
                )}
                {data.redemptions.map((r: any) => (
                  <div key={r._id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                       <div className={cn(
                         "w-2 h-2 rounded-full",
                         r._id === 'pending' ? 'bg-yellow-400' : 
                         r._id === 'approved' ? 'bg-green-400' :
                         r._id === 'fulfilled' ? 'bg-blue-400' : 'bg-gray-400'
                       )}></div>
                       <span className="text-sm font-bold text-gray-700 capitalize">{r._id || 'Unknown'}</span>
                    </div>
                    <div className="text-right">
                       <div className="text-sm font-black text-gray-900">{r.count}</div>
                       <div className="text-[10px] text-gray-500 flex items-center justify-end gap-1">
                          <Coins className="w-3 h-3 text-yellow-500" />
                          <span>{r.totalValue.toLocaleString()}</span>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Activity */}
      <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden border-red-50">
        <CardHeader className="bg-red-50/50 border-b border-red-100 py-4 px-6">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" /> Economy Watch: High XP Awards
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                       <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                       <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event</th>
                       <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                       <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Time</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {data.suspiciousXP.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">No unusual activity detected.</td></tr>}
                    {data.suspiciousXP.map((ev: any) => (
                      <tr key={ev._id} className="hover:bg-red-50/30 transition">
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               <Avatar className="w-6 h-6">
                                  <AvatarImage src={ev.userId?.profilePhoto} />
                                  <AvatarFallback className="text-[10px]">{ev.userId?.fullName?.[0]}</AvatarFallback>
                               </Avatar>
                               <span className="text-sm font-bold text-gray-900">{ev.userId?.fullName || 'Unknown'}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{ev.event}</span>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm font-black text-red-600">
                               <Zap className="w-3.5 h-3.5" />
                               <span>+{ev.xpAwarded}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-[10px] text-gray-400 text-right">
                            {new Date(ev.ts).toLocaleString()}
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
