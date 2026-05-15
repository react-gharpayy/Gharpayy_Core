'use client';
import React from 'react';
import { 
  Clock, 
  CalendarPlus, 
  Layout, 
  Heart, 
} from 'lucide-react';
import Link from 'next/link';

interface QuickActionsProps {
  onGiveKudo: () => void;
  attendance: any;
  onPunchToggle: () => void;
}

export function QuickActions({ onGiveKudo, attendance, onPunchToggle }: QuickActionsProps) {
  const isClockedIn = attendance?.isCheckedIn;

  const actions = [
    {
      label: isClockedIn ? 'Punch Out' : 'Punch In',
      icon: Clock,
      color: isClockedIn ? 'text-red-500' : 'text-emerald-500',
      bg: isClockedIn ? 'bg-red-50' : 'bg-emerald-50',
      onClick: onPunchToggle,
    },
    { label: 'Apply Leave', icon: CalendarPlus, href: '/my-leaves', color: 'text-blue-500', bg: 'bg-blue-50' },
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
          <button key={i} onClick={action.onClick} className="group text-left w-full">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-center space-y-3 h-full">
              <div className={`h-10 w-10 ${action.bg} ${action.color} rounded-xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110`}>
                <action.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-black text-gray-700 uppercase tracking-widest">{action.label}</p>
            </div>
          </button>
        )
      )}
    </div>
  );
}
