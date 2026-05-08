'use client';
import React from 'react';
import { ArrowRight, ClipboardList, FileCheck, Zap, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PendingAction {
  title: string;
  desc: string;
  urgency: string;
  href: string;
}

interface PendingActionsProps {
  actions: PendingAction[];
  loading?: boolean;
}

const ICON_MAP: Record<string, any> = {
  'Overdue Tasks': ClipboardList,
  'Leave Awaiting Approval': FileCheck,
  'Blocked Tasks': Zap,
};

export function PendingActions({ actions, loading }: PendingActionsProps) {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-gray-900 tracking-tight">Pending Actions</h3>
          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">Items requiring your attention</p>
        </div>
        {!loading && actions.length > 0 && (
          <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-black text-white">
            {actions.length}
          </div>
        )}
      </div>

      <div className="p-6 space-y-4 flex-1">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />
          ))
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm font-black text-gray-900">All clear!</p>
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">No pending actions</p>
          </div>
        ) : (
          actions.map((act, i) => {
            const Icon = ICON_MAP[act.title] || AlertCircle;
            const urgencyColor = act.urgency === 'high' ? 'text-red-500 bg-red-50 border-red-100' : 'text-orange-500 bg-orange-50 border-orange-100';
            const dotColor = act.urgency === 'high' ? 'bg-red-500 animate-pulse' : act.urgency === 'medium' ? 'bg-orange-500' : 'bg-blue-400';

            return (
              <Link key={i} href={act.href} className="block group">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-orange-200 hover:bg-orange-50/20 transition-all">
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${urgencyColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-sm font-black text-gray-900 truncate">{act.title}</h4>
                      <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{act.desc}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-orange-500 uppercase tracking-widest">
                      Resolve Now <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
