'use client';
import { useEffect, useState, useCallback } from 'react';

type Holiday = {
  _id: string;
  name: string;
  date: string;
  year: number;
  type: 'national' | 'regional' | 'optional' | 'restricted';
  description?: string;
};

const TYPE_COLORS: Record<string, string> = {
  national: 'bg-red-100 text-red-700',
  regional: 'bg-blue-100 text-blue-700',
  optional: 'bg-yellow-100 text-yellow-700',
  restricted: 'bg-purple-100 text-purple-700',
};

const CURRENT_YEAR = new Date().getFullYear();

export default function AdminHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [form, setForm] = useState({
    name: '',
    date: '',
    type: 'national',
    description: '',
  });

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/holidays?year=${year}`);
      const data = await res.json();
      if (data.success) setHolidays(data.data);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async () => {
    if (!form.name || !form.date) return showToast('Name and date are required', false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, year }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Holiday added successfully');
        setForm({ name: '', date: '', type: 'national', description: '' });
        setShowForm(false);
        fetchHolidays();
      } else {
        showToast(data.error || 'Failed to add holiday', false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from holiday list?`)) return;
    const res = await fetch(`/api/holidays?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('Holiday removed'); fetchHolidays(); }
    else showToast('Failed to remove', false);
  };

  const grouped = holidays.reduce<Record<string, Holiday[]>>((acc, h) => {
    const month = new Date(h.date).toLocaleString('default', { month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(h);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white text-sm shadow-lg ${
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        }`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Manage org-wide public holidays — auto-excluded from leave counts</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >+ Add Holiday</button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(['national', 'regional', 'optional', 'restricted'] as const).map(t => (
          <div key={t} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-800">
              {holidays.filter(h => h.type === t).length}
            </div>
            <div className={`text-xs font-medium mt-1 capitalize px-2 py-0.5 rounded-full inline-block ${TYPE_COLORS[t]}`}>{t}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Add New Holiday</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Holiday Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Diwali"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="national">National</option>
                <option value="regional">Regional</option>
                <option value="optional">Optional</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional note"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition disabled:opacity-60"
            >{submitting ? 'Saving...' : 'Save Holiday'}</button>
            <button
              onClick={() => { setShowForm(false); setForm({ name: '', date: '', type: 'national', description: '' }); }}
              className="border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50"
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Holiday list grouped by month */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading holidays...</div>
      ) : holidays.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-xl">
          <div className="text-4xl mb-2">📅</div>
          <p className="text-gray-500">No holidays added for {year} yet.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 text-sm underline">Add first holiday</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, list]) => (
            <div key={month} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700">{month} <span className="text-gray-400 font-normal text-sm">({list.length})</span></h3>
              </div>
              <div className="divide-y divide-gray-50">
                {list.map(h => (
                  <div key={h._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="text-center w-12">
                        <div className="text-lg font-bold text-gray-800 leading-none">
                          {new Date(h.date).getDate()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(h.date).toLocaleString('default', { weekday: 'short' })}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{h.name}</div>
                        {h.description && <div className="text-xs text-gray-400 mt-0.5">{h.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${TYPE_COLORS[h.type]}`}>{h.type}</span>
                      <button
                        onClick={() => handleDelete(h._id, h.name)}
                        className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition"
                      >Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
