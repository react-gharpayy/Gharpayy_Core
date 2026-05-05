'use client';
import { useEffect, useState } from 'react';

export default function WorkScheduleModal() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.role !== 'employee') return;
        const ws = d?.workSchedule;
        const hasSchedule = ws?.shiftType || (ws?.startTime && ws?.endTime);
        if (!hasSchedule) setOpen(true);
      })
      .catch(() => {});
  }, []);

  if (!open) return null;

  const close = () => {
    setSaving(false);
    setError('');
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
        <h3 className="text-lg font-bold text-gray-900">Work Schedule</h3>
        <p className="text-xs mt-1 text-gray-700">Your shift timing will be assigned by admin during approval.</p>
        {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
        <button onClick={close} disabled={saving}
          className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#f97316' }}>
          {saving ? 'Please wait...' : 'Okay'}
        </button>
      </div>
    </div>
  );
}
