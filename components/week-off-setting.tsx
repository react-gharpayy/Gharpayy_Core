'use client';
import { useEffect, useState } from 'react';
import { Calendar, CheckCircle } from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function WeekOffSetting() {
  const [current, setCurrent] = useState('Tuesday');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/zones/weekoff')
      .then(r => r.json())
      .then(d => { if (d.weekOffDay) setCurrent(d.weekOffDay); })
      .catch(() => {});
  }, []);

  const handleSave = async (day: string) => {
    if (day === current || saving) return;
    setSaving(true);
    try {
      const r = await fetch('/api/zones/weekoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOffDay: day }),
      });
      const d = await r.json();
      if (d.ok) {
        setCurrent(day);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {}
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-500" />
          <h3 className="font-bold text-gray-800 text-sm">Week Off Day</h3>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => handleSave(day)}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
              current === day
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500'
            } disabled:opacity-50`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Current week off: <strong className="text-gray-600">{current}</strong>
        &nbsp;·&nbsp;applies to all employees across all zones
      </p>
    </div>
  );
}