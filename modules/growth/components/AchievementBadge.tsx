'use client';

import React from 'react';
import { Award, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AchievementBadgeProps {
  id: string;
  title: string;
  description: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  earned: boolean;
  progress: number;
  className?: string;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  title,
  description,
  level,
  earned,
  progress,
  className
}) => {
  const levelColors = {
    bronze: "from-amber-600 to-amber-800",
    silver: "from-gray-300 to-gray-500",
    gold: "from-yellow-400 to-yellow-600",
    platinum: "from-indigo-400 to-indigo-600"
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "group relative flex flex-col items-center gap-1.5 transition-all duration-300",
            !earned && "opacity-40 grayscale",
            className
          )}>
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-md relative overflow-hidden",
              "bg-gradient-to-br",
              levelColors[level]
            )}>
              {/* Shimmer effect for earned badges */}
              {earned && (
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12" />
              )}
              
              {earned ? (
                <Award className="w-7 h-7 text-white" />
              ) : (
                <Lock className="w-5 h-5 text-white/50" />
              )}

              {/* Progress ring/border if not earned */}
              {!earned && (
                <div className="absolute inset-0 border-2 border-white/20 rounded-2xl" />
              )}
            </div>
            
            <div className="text-center">
              <div className="text-[10px] font-bold text-gray-800 truncate w-16 leading-tight">{title}</div>
              {!earned && (
                <div className="text-[8px] font-bold text-gray-500">{progress}%</div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-gray-900 text-white border-none p-3 rounded-xl shadow-xl max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-widest">{title}</p>
              <Badge variant="secondary" className="text-[8px] px-1 h-3.5 bg-white/10 text-white border-none">
                {level}
              </Badge>
            </div>
            <p className="text-[10px] text-gray-300 leading-relaxed">{description}</p>
            {!earned && (
              <div className="pt-1.5 space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-orange-400">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

import { Badge } from '@/components/ui/badge';
