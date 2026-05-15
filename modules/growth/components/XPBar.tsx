'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface XPBarProps {
  currentXP: number;
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
  progress: number;
  className?: string;
}

export const XPBar: React.FC<XPBarProps> = ({ 
  currentXP, 
  level, 
  xpInLevel, 
  xpForNextLevel, 
  progress,
  className 
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-end">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Level</span>
          <span className="text-2xl font-black text-orange-600 leading-none">{level}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Progress</span>
          <div className="text-xs font-bold text-gray-700">
            {xpInLevel} <span className="text-gray-400">/ {xpForNextLevel} XP</span>
          </div>
        </div>
      </div>
      
      <div className="relative pt-1">
        <Progress value={progress} className="h-2.5 bg-orange-100" />
        <div 
          className="absolute top-0 left-0 h-full w-full opacity-20 pointer-events-none"
          style={{ 
            backgroundImage: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite linear'
          }}
        />
      </div>
      
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};
