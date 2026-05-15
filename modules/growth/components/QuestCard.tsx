'use client';

import React from 'react';
import { CheckCircle2, Circle, Coins, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QuestCardProps {
  quest: {
    id: string;
    title: string;
    description: string;
    target: number;
    count: number;
    xpAward: number;
    coinAward: number;
    isCompleted: boolean;
    claimed: boolean;
  };
  onClaim?: (questId: string) => void;
  isClaiming?: boolean;
}

export const QuestCard: React.FC<QuestCardProps> = ({ quest, onClaim, isClaiming }) => {
  const progress = Math.min(100, Math.round((quest.count / quest.target) * 100));
  
  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-all duration-300",
      quest.claimed 
        ? "bg-gray-50 border-gray-100 opacity-75" 
        : quest.isCompleted 
          ? "bg-green-50/30 border-green-200 shadow-sm shadow-green-50" 
          : "bg-white border-gray-200 hover:border-orange-200"
    )}>
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-gray-900 leading-tight">{quest.title}</h4>
            {quest.claimed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-50" />
            ) : quest.isCompleted ? (
              <Trophy className="w-4 h-4 text-orange-500" />
            ) : null}
          </div>
          <p className="text-xs text-gray-500 line-clamp-1">{quest.description}</p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 text-[10px] font-bold text-orange-700">
             <Trophy className="w-3 h-3" />
             {quest.xpAward} XP
           </div>
           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-100 text-[10px] font-bold text-yellow-700">
             <Coins className="w-3 h-3" />
             {quest.coinAward}
           </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className={quest.isCompleted ? "text-green-600" : "text-gray-400"}>
            {quest.isCompleted ? "Target Reached!" : "Progress"}
          </span>
          <span className="text-gray-600">{quest.count} / {quest.target}</span>
        </div>
        <Progress value={progress} className={cn(
          "h-1.5",
          quest.isCompleted ? "bg-green-100" : "bg-gray-100"
        )} />
      </div>

      {quest.isCompleted && !quest.claimed && (
        <Button 
          onClick={() => onClaim?.(quest.id)}
          disabled={isClaiming}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold h-9 rounded-xl shadow-sm shadow-green-200"
        >
          {isClaiming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Claim Rewards"
          )}
        </Button>
      )}

      {quest.claimed && (
        <div className="w-full mt-4 py-2 border border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Claimed Successfully</span>
        </div>
      )}
    </div>
  );
};
