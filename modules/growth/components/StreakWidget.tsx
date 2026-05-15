'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakWidgetProps {
  count: number;
  className?: string;
}

export const StreakWidget: React.FC<StreakWidgetProps> = ({ count, className }) => {
  const active = count > 0;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
      active 
        ? "bg-orange-50 border-orange-200 text-orange-600 shadow-sm shadow-orange-100" 
        : "bg-gray-50 border-gray-100 text-gray-400",
      className
    )}>
      <div className={cn(
        "relative",
        active && "animate-pulse"
      )}>
        <Flame className={cn(
          "w-4 h-4",
          active ? "fill-orange-500" : "fill-none"
        )} />
        {active && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
        )}
      </div>
      <span className="text-sm font-bold tracking-tight">
        {count} <span className="text-[10px] uppercase opacity-70">Day Streak</span>
      </span>
    </div>
  );
};
