'use client';
import React from 'react';
import { 
  Users, 
  Zap, 
  Heart,
  TrendingUp,
  Map
} from 'lucide-react';

export function TeamPulse() {
  const pods = [
    { name: 'Core Operations', active: 12, total: 15, productivity: 92, kudos: 42 },
    { name: 'Field Agents', active: 28, total: 30, productivity: 85, kudos: 15 },
  ];

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-gray-900 tracking-tight">Team Pulse</h3>
          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">Pod operational insights</p>
        </div>
        <div className="flex -space-x-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
              <img src={`https://i.pravatar.cc/100?u=${i}`} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
          <div className="h-6 w-6 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center text-[8px] font-black text-white">
            +40
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6 flex-1">
        {pods.map((pod, i) => (
          <div key={i} className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <h4 className="text-sm font-black text-gray-900">{pod.name}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{pod.active}/{pod.total} Members Active</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-emerald-500">{pod.productivity}%</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Productivity</p>
              </div>
            </div>
            
            <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${pod.productivity > 90 ? 'bg-emerald-500' : 'bg-orange-500'}`} 
                style={{ width: `${pod.productivity}%` }} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                <Heart className="h-3 w-3 text-pink-500" />
                <span className="text-[10px] font-black text-gray-900">{pod.kudos} Kudos</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                <Map className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] font-black text-gray-900">12 Agents Live</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50/50 border-t border-gray-50 text-center">
        <button className="text-[10px] font-black text-gray-400 hover:text-orange-500 uppercase tracking-[0.2em] transition-colors">
          Full team analytics
        </button>
      </div>
    </div>
  );
}
