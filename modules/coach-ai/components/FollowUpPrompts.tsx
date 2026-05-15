'use client';

import React from 'react';
import { ChevronRight, Compass } from 'lucide-react';

interface FollowUpPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  isLoading?: boolean;
}

export const FollowUpPrompts: React.FC<FollowUpPromptsProps> = ({ prompts, onSelect, isLoading }) => {
  if (prompts.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
      <div className="flex items-center gap-2 px-1">
        <Compass className="w-3 h-3 text-gray-400" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Executive Investigation Pathways</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => onSelect(prompt)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-full hover:border-orange-200 hover:bg-orange-50 transition-all group disabled:opacity-50"
          >
            <span className="text-[11px] font-semibold text-gray-600 group-hover:text-orange-700 whitespace-nowrap">
              {prompt}
            </span>
            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-orange-400 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};
