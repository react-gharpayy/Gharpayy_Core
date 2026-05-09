'use client';
import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Video, CheckSquare, RefreshCw } from 'lucide-react';
import SessionDetailModal from './SessionDetailModal';

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = [
  ['#f97316','#1a0f00'], ['#6366f1','#0d0d24'], ['#10b981','#001a0f'],
  ['#a855f7','#150024'], ['#f59e0b','#1a1300'], ['#ef4444','#1a0000'],
];

function avColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function EmployeeCoaching() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const fetchDashboard = () => {
    setLoading(true);
    fetch(`/api/coaching?tab=${activeTab}`)
      .then(res => res.json())
      .then(d => {
        if (d.ok) setSessions(d.sessions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeTab]);

  const cardStyle = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My 1:1 Sessions</h1>
          <div className="text-sm text-gray-500 mt-1">Your 1:1 sessions and action items</div>
        </div>
        <button onClick={fetchDashboard} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex space-x-1 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl overflow-x-auto w-full sm:w-max">
        {[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'past', label: 'Past Sessions' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
           Array(4).fill(0).map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse"></div>)
        ) : sessions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 border-dashed">
            No {activeTab} 1:1 sessions found.
          </div>
        ) : (
          sessions.map(session => {
            const [bg, fg] = avColor(session.conductedByName);
            const dateStr = new Date(session.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            const pendingActions = session.actionItems?.filter((a: any) => a.status !== 'completed').length || 0;

            return (
              <div 
                key={session._id} 
                style={cardStyle} 
                className="p-5 cursor-pointer hover:border-orange-500/30 transition-colors group relative overflow-hidden flex flex-col"
                onClick={() => setSelectedSessionId(session._id)}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: bg, color: fg }}>
                    {initials(session.conductedByName)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">1:1 with {session.conductedByName}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                      <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                      {dateStr} ({session.duration}m)
                    </div>
                  </div>
                </div>

                <div className="flex-1"></div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    {pendingActions > 0 ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-orange-600 font-semibold">{pendingActions} pending actions</span>
                      </>
                    ) : (
                       <span className="text-emerald-600">All actions completed</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-orange-500 flex items-center gap-1 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    Open Session &rarr;
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedSessionId && (
        <SessionDetailModal
          sessionId={selectedSessionId}
          isOpen={!!selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
          onUpdate={fetchDashboard}
          isEmployeeView={true}
        />
      )}
    </div>
  );
}
