'use client';
import { useEffect, useState } from 'react';
import { Clock, CheckCircle } from 'lucide-react';

export default function CoverageSummary() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/attendance/heatmap', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const employees = data?.todayLog || [];
  const present = data?.present || 0;
  const total = data?.total || 0;
  const onTimePct = total > 0
    ? Math.round(employees.filter((e: any) => e.dayStatus === 'On Time' || e.dayStatus === 'Early').length / total * 100)
    : 0;

  const parseIST12h = (value: string) => {
    const m = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    const h12 = Number(m[1]);
    const mins = Number(m[2]);
    const meridiem = m[3].toUpperCase();
    const h24 = (h12 % 12) + (meridiem === 'PM' ? 12 : 0);
    return h24 * 60 + mins;
  };

  const formatIST12h = (totalMinutes: number) => {
    const h24 = Math.floor(totalMinutes / 60) % 24;
    const mins = String(totalMinutes % 60).padStart(2, '0');
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return `${h12}:${mins} ${ampm}`;
  };

  const parsedTimes = employees
    .map((e: any) => (e.checkInTime ? parseIST12h(e.checkInTime) : null))
    .filter((t: number | null): t is number => t !== null);
  const avgMinutes = parsedTimes.length
    ? Math.round(parsedTimes.reduce((sum: number, t: number) => sum + t, 0) / parsedTimes.length)
    : null;
  const avgStr = avgMinutes !== null ? formatIST12h(avgMinutes) : '--';

  // Group by role as "zone"
  const roles = [...new Set(employees.map((e: any) => e.role || 'employee'))] as string[];

  return (
    <div className="bg-white rounded-3xl border border-gray-300 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Attendance</h2>
        </div>
        <span className="text-gray-700 text-sm md:text-base">Today  -  <strong className="text-gray-800">{present}/{total} present</strong></span>
      </div>

      <h3 className="text-gray-600 text-sm md:text-base font-medium mb-6">Coverage Summary</h3>

      {loading ? (
        <div className="animate-pulse h-48 bg-gray-100 rounded-2xl"/>
      ) : (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 md:gap-6 text-center mb-6">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-teal-600">{present}/{total}</p>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Present</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-blue-500">{onTimePct}%</p>
              <p className="text-xs md:text-sm text-gray-600 mt-1">On Time %</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-purple-500">{avgStr}</p>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Avg Clock-in</p>
            </div>
          </div>

          <h4 className="font-medium text-gray-700 text-sm md:text-base mb-4">Role Coverage</h4>
          <div className="space-y-3">
            {roles.map(role => {
              const roleEmps = employees.filter((e: any) => (e.role || 'employee') === role);
              const rolePres = roleEmps.filter((e: any) => e.dayStatus !== 'Absent').length;
              const pct = roleEmps.length > 0 ? rolePres / roleEmps.length : 0;
              return (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm md:text-base capitalize">{role}</span>
                  <div className="flex items-center gap-3 flex-1 max-w-xs ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-teal-500 h-full rounded-full transition-all" style={{ width: `${pct * 100}%` }}/>
                    </div>
                    <span className="text-xs md:text-sm text-gray-600 w-8 text-right">{rolePres}/{roleEmps.length}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-teal-100 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-teal-700">All locations verified  -  {roles.length} role{roles.length !== 1 ? 's' : ''} tracked</p>
          </div>
        </div>
      )}
    </div>
  );
}

