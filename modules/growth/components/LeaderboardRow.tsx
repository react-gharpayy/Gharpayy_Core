'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trophy, Medal, Coins, Flame, Zap } from 'lucide-react';

interface LeaderboardRowProps {
  rank: number;
  name: string;
  photo?: string;
  team?: string;
  role?: string;
  value: number;
  level: number;
  isCurrentUser?: boolean;
  metricLabel?: string;
}

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  rank,
  name,
  photo,
  team,
  role,
  value,
  level,
  isCurrentUser,
  metricLabel = 'XP'
}) => {
  const isTop3 = rank <= 3;
  
  const rankIcon = () => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-400">#{rank}</span>;
  };

  return (
    <div className={cn(
      "flex items-center gap-4 p-3 rounded-2xl transition-all border",
      isCurrentUser 
      ? "bg-orange-50 border-orange-200 shadow-sm shadow-orange-100" 
      : "bg-white border-transparent hover:border-gray-100 hover:bg-gray-50/50"
    )}>
      <div className="w-8 flex justify-center flex-shrink-0">
        {rankIcon()}
      </div>

      <Avatar className="w-10 h-10 border-2 border-white shadow-sm flex-shrink-0">
        <AvatarImage src={photo} />
        <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
          {name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn(
            "text-sm font-bold truncate",
            isCurrentUser ? "text-orange-900" : "text-gray-900"
          )}>{name}</h4>
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-orange-200 text-orange-600 bg-orange-50/50">
            Lvl {level}
          </Badge>
        </div>
        <p className="text-[10px] text-gray-500 truncate">{role || 'Employee'} • {team || 'Core Team'}</p>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="flex items-center justify-end gap-1.5 text-sm font-black text-gray-900">
           {metricLabel === 'COINS' && <Coins className="w-3.5 h-3.5 text-yellow-500" />}
           {metricLabel === 'XP' && <Zap className="w-3.5 h-3.5 text-orange-500" />}
           {metricLabel === 'STREAK' && <Flame className="w-3.5 h-3.5 text-orange-500" />}
           <span>{value.toLocaleString()}</span>
        </div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{metricLabel}</div>
      </div>
    </div>
  );
};
