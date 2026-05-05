'use client';

import { useState } from 'react';

type Props = {
  onSuccess?: () => void;
};

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'comp_off', label: 'Comp Off' },
  { value: 'lop', label: 'Loss of Pay (LOP)' },
  { value: 'other', label: 'Other' },
];

export default function LeaveRequestForm({ onSuccess }: Props) {
  const [form, setForm] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    totalDays: 1,
    reason: '',
    isHalfDay: false,
    halfDaySession: 'morning' as 'morning' | 'afternoon',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const calcDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      return {
        ...updated,
        totalDays: updated.isHalfDay ? 0.5 : calcDays(updated.startDate, updated.endDate),
      };
    });
  };

  const handleHalfDay = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setForm((prev) => ({
      ...prev,
      isHalfDay: checked,
      totalDays: checked ? 0.5 : calcDays(prev.startDate, prev.endDate),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.startDate || !form.endDate) {
      setError('Please select start and end dates.');
      return;
    }
    if (form.startDate > form.endDate) {
      setError('Start date cannot be after end date.');
      return;
    }
    if (!form.reason.trim()) {
      setError('Please provide a reason.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          totalDays: form.totalDays,
          reason: form.reason.trim(),
          isHalfDay: form.isHalfDay,
          halfDaySession: form.isHalfDay ? form.halfDaySession : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit leave request.');
      } else {
        setSuccess('Leave request submitted successfully!');
        setForm({ leaveType: 'casual', startDate: '', endDate: '', totalDays: 1, reason: '', isHalfDay: false, halfDaySession: 'morning' });
        setTimeout(() => onSuccess?.(), 1200);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
      <h2 className="text-base font-semibold text-gray-800 mb-5">Apply for Leave</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Leave Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
          <select
            name="leaveType"
            value={form.leaveType}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleDateChange}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              min={form.startDate}
              onChange={handleDateChange}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Half Day */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isHalfDay"
            name="isHalfDay"
            checked={form.isHalfDay}
            onChange={handleHalfDay}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isHalfDay" className="text-sm text-gray-700">Half Day</label>
          {form.isHalfDay && (
            <select
              name="halfDaySession"
              value={form.halfDaySession}
              onChange={handleChange}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          )}
        </div>

        {/* Total Days (readonly) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Days</label>
          <div className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
            {form.totalDays} day{form.totalDays !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <textarea
            name="reason"
            value={form.reason}
            onChange={handleChange}
            rows={3}
            maxLength={500}
            placeholder="Briefly describe the reason for your leave..."
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">{form.reason.length}/500</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Leave Request'}
        </button>
      </form>
    </div>
  );
}
