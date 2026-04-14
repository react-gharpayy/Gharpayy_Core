'use client';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface HeatmapRow {
  employeeId: string;
  employeeName: string;
  days: Record<string, string>;
}

const STATUS_COLOR: Record<string, string> = {
  'Early':    'bg-emerald-600',
  'On Time':  'bg-emerald-500',
  'Late':     'bg-orange-400',
  'Absent':   'bg-gray-300',
  'Week Off': 'bg-blue-100 border border-blue-200',
  'none':     'bg-gray-200',
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTShiftedNow() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function getWeekDates() {
  const now = getISTShiftedNow();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + mondayOffset);

  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return { label, date: d.toISOString().split('T')[0] };
  });
}

function getWeekStr() {
  const now = getISTShiftedNow();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + mondayOffset);
  const year = monday.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((monday.getTime() - startOfYear.getTime()) / 86400000);
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${year}-${String(week).padStart(2, '0')}`;
}

export default function WeeklyHeatmap() {
  const [heatmap, setHeatmap] = useState<HeatmapRow[]>([]);
  const [present, setPresent] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [weekOffLabel, setWeekOffLabel] = useState<string>('Tue');

  const weekDays = getWeekDates();
  const today = getISTShiftedNow().toISOString().split('T')[0];

  useEffect(() => {
    fetch(`/api/attendance/heatmap?week=${getWeekStr()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.heatmap) setHeatmap(d.heatmap);
        if (d.present !== undefined) setPresent(d.present);
        if (d.total !== undefined) setTotal(d.total);
        if (d.shiftInfo?.weekOffLabel) setWeekOffLabel(d.shiftInfo.weekOffLabel);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-gray-300 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Attendance</h2>
        </div>
        <span className="text-gray-700 text-sm md:text-base">
          Today  -  <strong className="text-gray-800">{present}/{total} present</strong>
        </span>
      </div>

      <h3 className="text-gray-600 text-sm md:text-base font-medium mb-6">Weekly Heatmap</h3>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-2 items-center">
              <div className="w-20 h-4 bg-gray-200 rounded"/>
              {[1,2,3,4,5,6,7].map(j => <div key={j} className="flex-1 h-10 bg-gray-100 rounded-lg"/>)}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">

            {/* Day headers */}
            <div className="flex gap-2 mb-4">
              <div className="w-20 flex-shrink-0"/>
              {weekDays.map(d => (
                <div
                  key={d.date}
                  className={`flex-1 min-w-[48px] text-center text-xs md:text-sm font-medium ${
                    d.date === today
                      ? 'text-orange-500'
                      : d.label === weekOffLabel
                      ? 'text-gray-300'
                      : 'text-gray-700'
                  }`}
                >
                  {d.label}
                  {d.label === weekOffLabel && (
                    <div className="text-[9px] text-gray-300 leading-none">off</div>
                  )}
                </div>
              ))}
            </div>

            {/* Heatmap rows */}
            <div className="space-y-3">
              {heatmap.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  No attendance data yet this week
                </p>
              ) : heatmap.map(row => (
                <div key={row.employeeId} className="flex gap-2 items-center">
                  <div className="w-20 flex-shrink-0 text-xs md:text-sm text-gray-600 truncate">
                    {row.employeeName.split(' ').map((n, i) => i === 0 ? n : n[0] + '.').join(' ')}
                  </div>
                  {weekDays.map(d => {
                    const isWeekOff = d.label === weekOffLabel;
                    const status: string = isWeekOff
                      ? 'Week Off'
                      : (row.days[d.date] as string) || 'none';
                    return (
                      <div
                        key={d.date}
                        title={isWeekOff ? 'Week Off' : status === 'none' ? '-' : status}
                        className={`flex-1 min-w-[48px] h-10 md:h-12 rounded-lg ${STATUS_COLOR[status]} transition hover:opacity-80 ${
                          status === 'Late' ? 'ring-2 ring-orange-500/70' : ''
                        } ${
                          d.date === today ? 'ring-2 ring-orange-400 ring-offset-1' : ''
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 md:gap-6 mt-6 pt-4 border-t border-gray-200">
        {([
          { key: 'On Time', label: 'Present' },
          { key: 'Late', label: 'Late' },
          { key: 'Absent', label: 'Absent' },
          { key: 'Week Off', label: 'Off' },
        ] as any[]).map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${STATUS_COLOR[s.key]}`}/>
            <span className="text-xs md:text-sm text-gray-600">{s.label}</span>
          </div>
        ))}
        <span className="text-xs text-gray-600">Late overlay: highlighted border</span>
      </div>
    </div>
  );
}
