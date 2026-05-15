'use client';

import React, { useEffect, useState } from 'react';
import { Coins, ShoppingBag, History, Info, Loader2, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import GrowthLayoutWrapper from '@/modules/growth/components/GrowthLayoutWrapper';
import { useRouter } from 'next/navigation';

export default function ShopPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [shopRes, redRes] = await Promise.all([
        fetch('/api/growth/shop'),
        fetch('/api/growth/redemptions')
      ]);
      const shopData = await shopRes.json();
      const redData = await redRes.json();
      
      if (shopData.ok) {
        if (shopData.isAdmin) {
          router.push('/growth/admin/analytics');
          return;
        }
        setData(shopData);
      }
      if (redData.ok) setRedemptions(redData.redemptions);
    } catch (e) {
      toast.error("Failed to load shop data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRedeem = async (rewardId: string) => {
    setRedeemingId(rewardId);
    try {
      const r = await fetch('/api/growth/shop/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId })
      });
      const d = await r.json();
      if (d.ok) {
        toast.success(`Redeemed ${d.redemption.rewardTitle}!`, {
          description: d.redemption.status === 'pending' ? "Waiting for manager approval." : "Reward available immediately.",
          icon: <Sparkles className="w-5 h-5 text-yellow-500" />
        });
        fetchData();
      } else {
        toast.error(d.error || "Redemption failed");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setRedeemingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-700', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
      fulfilled: { color: 'bg-blue-100 text-blue-700', label: 'Fulfilled' },
      cancelled: { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' }
    };
    const s = map[status] || map.pending;
    return <Badge className={cn("text-[10px] border-none font-bold", s.color)}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <GrowthLayoutWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-medium text-gray-500">Opening catalog...</p>
        </div>
      </GrowthLayoutWrapper>
    );
  }

  return (
    <GrowthLayoutWrapper>
      <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-orange-500" />
            Reward Shop
          </h1>
          <p className="text-gray-500 font-medium">Redeem your hard-earned coins for exclusive perks.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white border border-gray-200 px-6 py-4 rounded-3xl shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center">
            <Coins className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Balance</div>
            <div className="text-2xl font-black text-gray-900">{data?.userCoins?.toLocaleString() || 0}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md bg-gray-100 p-1 rounded-2xl h-12">
          <TabsTrigger value="catalog" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Catalog
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all">
            <History className="w-4 h-4 mr-2" />
            My Redemptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.rewards?.map((reward: any) => {
              const canAfford = data.userCoins >= reward.coinCost;
              return (
                <Card key={reward.id} className={cn(
                  "rounded-3xl border-gray-200 overflow-hidden flex flex-col transition-all duration-300",
                  !canAfford && "opacity-90 grayscale-[0.5]"
                )}>
                  <CardHeader className="p-0">
                    <div className={cn(
                      "h-32 flex items-center justify-center relative",
                      reward.rarity === 'legendary' ? "bg-indigo-600" :
                      reward.rarity === 'epic' ? "bg-purple-600" :
                      reward.rarity === 'rare' ? "bg-blue-600" : "bg-gray-700"
                    )}>
                       <div className="absolute top-3 right-3">
                         <Badge variant="secondary" className="bg-white/20 text-white border-none text-[10px] font-bold uppercase tracking-wider">
                           {reward.rarity}
                         </Badge>
                       </div>
                       <ShoppingBag className="w-12 h-12 text-white/20" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-bold text-gray-900">{reward.title}</CardTitle>
                      </div>
                      <CardDescription className="text-xs text-gray-500 line-clamp-2">
                        {reward.description}
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-2">
                       <Badge variant="outline" className="text-[10px] font-bold text-gray-400 capitalize">
                         {reward.category}
                       </Badge>
                       {reward.approvalRequired && (
                         <Badge variant="outline" className="text-[10px] font-bold text-yellow-600 bg-yellow-50 border-yellow-100 flex gap-1 items-center">
                           <Info className="w-3 h-3" /> Requires Approval
                         </Badge>
                       )}
                       {reward.cooldownDays > 0 && (
                         <Badge variant="outline" className="text-[10px] font-bold text-gray-400 flex gap-1 items-center">
                           <Clock className="w-3 h-3" /> {reward.cooldownDays}d CD
                         </Badge>
                       )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Button 
                      className={cn(
                        "w-full h-12 rounded-2xl font-black text-sm transition-all",
                        canAfford 
                          ? "bg-gray-900 hover:bg-black text-white" 
                          : "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100"
                      )}
                      disabled={!canAfford || redeemingId === reward.id}
                      onClick={() => handleRedeem(reward.id)}
                    >
                      {redeemingId === reward.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                           <Coins className={cn("w-4 h-4", canAfford ? "text-yellow-400" : "text-gray-300")} />
                           <span>{reward.coinCost.toLocaleString()} Coins</span>
                        </div>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-8">
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reward</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Cost</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {redemptions.map((r: any) => (
                    <tr key={r._id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{r.rewardTitle}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{r.notes || 'No notes'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-sm font-black text-gray-900">
                           <Coins className="w-3.5 h-3.5 text-yellow-500" />
                           <span>{r.coinCost.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(r.status)}
                      </td>
                    </tr>
                  ))}
                  {redemptions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                        You haven't redeemed any rewards yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </GrowthLayoutWrapper>
  );
}
