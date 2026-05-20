'use client';
import React from 'react';
import { 
  Clock, 
  Coffee, 
  Layout, 
  Heart, 
} from 'lucide-react';
import Link from 'next/link';

interface QuickActionsProps {
  onGiveKudo: () => void;
  attendance: any;
  onPunchToggle: () => void;
  onBreakToggle: () => void;
  processing?: boolean;
}

export function QuickActions({ onGiveKudo, attendance, onPunchToggle, onBreakToggle, processing = false }: QuickActionsProps) {
  const isClockedIn = attendance?.isCheckedIn;
  const isOnBreak = attendance?.isOnBreak;
  const isBreakDisabled = !isClockedIn && !isOnBreak;

  const actions = [
    {
      label: isClockedIn ? 'Punch Out' : 'Punch In',
      icon: Clock,
      color: isClockedIn ? 'text-red-500' : 'text-emerald-500',
      bg: isClockedIn ? 'bg-red-50' : 'bg-emerald-50',
      onClick: onPunchToggle,
      disabled: processing,
    },
    {
      label: isOnBreak ? 'End Break' : 'Start Break',
      icon: Coffee,
      color: isOnBreak 
        ? 'text-indigo-600' 
        : isBreakDisabled 
          ? 'text-gray-400' 
          : 'text-amber-500',
      bg: isOnBreak 
        ? 'bg-indigo-50 border border-indigo-200 animate-pulse' 
        : isBreakDisabled 
          ? 'bg-gray-50' 
          : 'bg-amber-50',
      onClick: onBreakToggle,
      disabled: isBreakDisabled || processing,
    },
    { label: 'Arena Console', icon: Layout, href: '/arena', color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Give Kudos', icon: Heart, onClick: onGiveKudo, color: 'text-pink-500', bg: 'bg-pink-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {actions.map((action, i) =>
        action.href ? (
          <Link key={i} href={action.href} className="group">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-center space-y-3 h-full">
              <div className={`h-10 w-10 ${action.bg} ${action.color} rounded-xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110`}>
                <action.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-black text-gray-700 uppercase tracking-widest">{action.label}</p>
            </div>
          </Link>
        ) : (
          <button 
            key={i} 
            onClick={action.onClick} 
            disabled={action.disabled}
            className={`group text-left w-full ${action.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className={`p-4 rounded-2xl border shadow-sm transition-all text-center space-y-3 h-full flex flex-col justify-between ${
              action.label === 'End Break' 
                ? 'border-indigo-200 bg-indigo-50/20 shadow-indigo-50/50' 
                : action.disabled && action.label === 'Start Break'
                  ? 'border-gray-100 bg-gray-50/50'
                  : 'bg-white border-gray-100 hover:shadow-md hover:border-orange-200'
            }`}>
              <div className={`h-10 w-10 ${action.bg} ${action.color} rounded-xl flex items-center justify-center mx-auto transition-transform ${action.disabled ? '' : 'group-hover:scale-110'}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <p className={`text-xs font-black uppercase tracking-widest ${action.disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                {processing && !action.disabled && action.onClick ? 'Processing...' : action.label}
              </p>
            </div>
          </button>
        )
      )}
    </div>
  );
}
