'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Pencil, Archive, ToggleLeft, ToggleRight,
  Loader2, Target, X, Save, AlertCircle, Calendar, Clock, Coins
} from 'lucide-react';

type QuestKind = 'daily' | 'weekly' | 'seasonal';

interface Quest {
  _id: string;
  questId: string;
  title: string;
  description: string;
  kind: QuestKind;
  target: number;
  metric: string;
  xpAward: number;
  coinAward: number;
  active: boolean;
}

const KIND_COLORS: Record<QuestKind, string> = {
  daily: 'bg-blue-100 text-blue-700',
  weekly: 'bg-purple-100 text-purple-700',
  seasonal: 'bg-orange-100 text-orange-700',
};

const BLANK: Partial<Quest> = {
  title: '', description: '', kind: 'daily', target: 1,
  metric: 'ontime_checkin', xpAward: 50, coinAward: 20, active: true,
};

const METRICS = [
  { value: 'ontime_checkin', label: 'On-time Check-in' },
  { value: 'tasks_closed', label: 'Tasks Completed' },
  { value: 'eod_submitted', label: 'EOD Report Submitted' },
  { value: 'kudo_given', label: 'Kudos Given' },
  { value: 'coaching_done', label: 'Coaching Session' },
];

export default function AdminQuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'seasonal'>('all');
  const [modal, setModal] = useState<{ open: boolean; editing: Quest | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Partial<Quest>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchQuests = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/growth/admin/quests' : `/api/growth/admin/quests?kind=${filter}`;
      const r = await fetch(url, { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) setQuests(d.quests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuests(); }, [filter]);

  const openCreate = () => {
    setForm(BLANK);
    setError('');
    setModal({ open: true, editing: null });
  };

  const openEdit = (q: Quest) => {
    setForm({ ...q });
    setError('');
    setModal({ open: true, editing: q });
  };

  const closeModal = () => setModal({ open: false, editing: null });

  const handleSave = async () => {
    if (!form.title || !form.description || !form.metric) { setError('Title, description and metric are required.'); return; }
    setSaving(true); setError('');
    try {
      let res;
      if (modal.editing) {
        res = await fetch(`/api/growth/admin/quests/${modal.editing._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch('/api/growth/admin/quests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      const d = await res.json();
      if (!d.ok) { setError(d.error || 'Save failed'); return; }
      closeModal();
      fetchQuests();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (q: Quest) => {
    await fetch(`/api/growth/admin/quests/${q._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !q.active }),
    });
    fetchQuests();
  };

  const archiveQuest = async (q: Quest) => {
    if (!confirm(`Archive quest "${q.title}"?`)) return;
    await fetch(`/api/growth/admin/quests/${q._id}`, { method: 'DELETE' });
    fetchQuests();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-orange-500" />
            Quest Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure daily and weekly missions for all employees.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-bold text-sm rounded-xl hover:bg-orange-700 transition shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> New Quest
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit border border-gray-200/50">
        {(['all', 'daily', 'weekly', 'seasonal'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-200 ${filter === f ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fetching Quests...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Quest', 'Kind', 'Metric', 'Target', 'XP', 'Coins', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quests.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400 font-medium italic">No quests found in this category.</td></tr>
                )}
                {quests.map((q) => (
                  <tr key={q._id} className="hover:bg-orange-50/20 transition group">
                    <td className="px-5 py-3">
                      <div className="font-bold text-sm text-gray-900 max-w-[180px] truncate group-hover:text-orange-600 transition-colors">{q.title}</div>
                      <div className="text-[11px] text-gray-400 max-w-[180px] truncate">{q.description}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${KIND_COLORS[q.kind]}`}>{q.kind}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{q.metric}</span>
                    </td>
                    <td className="px-5 py-3 font-black text-sm text-gray-800">{q.target}</td>
                    <td className="px-5 py-3 text-sm font-black text-orange-600">+{q.xpAward} XP</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-sm font-black text-yellow-600">
                        <Coins className="w-3.5 h-3.5" />
                        <span>+{q.coinAward}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${q.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {q.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(q)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-orange-500 transition" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleActive(q)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-500 transition" title={q.active ? 'Deactivate' : 'Activate'}>
                          {q.active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => archiveQuest(q)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-500 transition" title="Archive">
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-900">{modal.editing ? 'Edit Quest' : 'New Quest'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Title *</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition"
                  value={form.title || ''}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Daily Check-in Specialist"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Description *</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition resize-none"
                  rows={2}
                  value={form.description || ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe what the employee needs to do..."
                />
              </div>

              {/* Kind + Metric row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Frequency (Kind)</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition"
                    value={form.kind || 'daily'}
                    onChange={e => setForm(p => ({ ...p, kind: e.target.value as QuestKind }))}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Metric *</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition"
                    value={form.metric || ''}
                    onChange={e => setForm(p => ({ ...p, metric: e.target.value }))}
                  >
                    {METRICS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                    {!METRICS.find(m => m.value === form.metric) && form.metric && (
                      <option value={form.metric}>{form.metric}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Target + Metric label reminder */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Target Number</label>
                <div className="flex items-center gap-3">
                   <input
                    type="number" min={1}
                    className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition"
                    value={form.target ?? 1}
                    onChange={e => setForm(p => ({ ...p, target: Number(e.target.value) }))}
                  />
                  <span className="text-xs text-gray-400 italic">events of type "{form.metric}" to complete.</span>
                </div>
              </div>

              {/* XP + Coins row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">XP Awarded</label>
                  <input
                    type="number" min={0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition"
                    value={form.xpAward ?? 50}
                    onChange={e => setForm(p => ({ ...p, xpAward: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Coins Awarded</label>
                  <input
                    type="number" min={0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 transition"
                    value={form.coinAward ?? 20}
                    onChange={e => setForm(p => ({ ...p, coinAward: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active !== false}
                    onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700 font-medium">Quest is Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save Quest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
