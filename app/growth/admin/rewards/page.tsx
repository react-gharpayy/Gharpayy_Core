'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Pencil, Archive, ToggleLeft, ToggleRight,
  Loader2, ShoppingBag, X, Save, AlertCircle, Coins
} from 'lucide-react';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
type Category = 'flexibility' | 'food' | 'recognition' | 'perks' | 'learning';

interface Reward {
  _id: string;
  rewardId: string;
  title: string;
  description: string;
  category: Category;
  rarity: Rarity;
  coinCost: number;
  approvalRequired: boolean;
  cooldownDays: number;
  stockLimit?: number;
  active: boolean;
  image?: string;
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'bg-gray-100 text-gray-700',
  rare: 'bg-blue-100 text-blue-700',
  epic: 'bg-purple-100 text-purple-700',
  legendary: 'bg-orange-100 text-orange-700',
};

const BLANK: Partial<Reward> = {
  title: '', description: '', category: 'perks', rarity: 'common',
  coinCost: 100, approvalRequired: false, cooldownDays: 0, active: true,
};

export default function AdminRewardsPage() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modal, setModal] = useState<{ open: boolean; editing: Reward | null }>({ open: false, editing: null });
  const [form, setForm] = useState<Partial<Reward>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/growth/admin/rewards?status=${filter}`, { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) setRewards(d.rewards);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRewards(); }, [filter]);

  const openCreate = () => {
    setForm(BLANK);
    setError('');
    setModal({ open: true, editing: null });
  };

  const openEdit = (r: Reward) => {
    setForm({ ...r });
    setError('');
    setModal({ open: true, editing: r });
  };

  const closeModal = () => setModal({ open: false, editing: null });

  const handleSave = async () => {
    if (!form.title || !form.description) { setError('Title and description are required.'); return; }
    setSaving(true); setError('');
    try {
      let res;
      if (modal.editing) {
        res = await fetch(`/api/growth/admin/rewards/${modal.editing._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch('/api/growth/admin/rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      const d = await res.json();
      if (!d.ok) { setError(d.error || 'Save failed'); return; }
      closeModal();
      fetchRewards();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: Reward) => {
    await fetch(`/api/growth/admin/rewards/${r._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !r.active }),
    });
    fetchRewards();
  };

  const archiveReward = async (r: Reward) => {
    if (!confirm(`Archive "${r.title}"? It will be hidden from the shop.`)) return;
    await fetch(`/api/growth/admin/rewards/${r._id}`, { method: 'DELETE' });
    fetchRewards();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-orange-500" />
            Reward Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create, edit and manage rewards available in the shop.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white font-bold text-sm rounded-xl hover:bg-orange-600 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Reward
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition ${filter === f ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Reward', 'Category', 'Rarity', 'Cost', 'Cooldown', 'Approval', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rewards.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">No rewards found.</td></tr>
                )}
                {rewards.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/60 transition">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-sm text-gray-900 max-w-[180px] truncate">{r.title}</div>
                      <div className="text-[11px] text-gray-400 max-w-[180px] truncate">{r.description}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium text-gray-600 capitalize">{r.category}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${RARITY_COLORS[r.rarity]}`}>{r.rarity}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                        <Coins className="w-3.5 h-3.5 text-yellow-500" />
                        <span>{r.coinCost.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{r.cooldownDays}d</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.approvalRequired ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {r.approvalRequired ? 'Required' : 'Auto'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-orange-500 transition" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleActive(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-500 transition" title={r.active ? 'Deactivate' : 'Activate'}>
                          {r.active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => archiveReward(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-500 transition" title="Archive">
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
              <h2 className="font-black text-gray-900">{modal.editing ? 'Edit Reward' : 'New Reward'}</h2>
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 transition"
                  value={form.title || ''}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Early Exit Pass"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Description *</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 transition resize-none"
                  rows={2}
                  value={form.description || ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the reward..."
                />
              </div>

              {/* Category + Rarity row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Category</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 transition"
                    value={form.category || 'perks'}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value as Category }))}
                  >
                    {['flexibility', 'food', 'recognition', 'perks', 'learning'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Rarity</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 transition"
                    value={form.rarity || 'common'}
                    onChange={e => setForm(p => ({ ...p, rarity: e.target.value as Rarity }))}
                  >
                    {['common', 'rare', 'epic', 'legendary'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coin Cost + Cooldown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1">
                    Coin Cost <Coins className="w-3 h-3 text-yellow-500" />
                  </label>
                  <input
                    type="number" min={0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 transition"
                    value={form.coinCost ?? 100}
                    onChange={e => setForm(p => ({ ...p, coinCost: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Cooldown (days)</label>
                  <input
                    type="number" min={0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 transition"
                    value={form.cooldownDays ?? 0}
                    onChange={e => setForm(p => ({ ...p, cooldownDays: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Stock Limit */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Stock Limit (leave blank for unlimited)</label>
                <input
                  type="number" min={0}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 transition"
                  value={form.stockLimit ?? ''}
                  onChange={e => setForm(p => ({ ...p, stockLimit: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Unlimited"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.approvalRequired}
                    onChange={e => setForm(p => ({ ...p, approvalRequired: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">Requires Approval</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active !== false}
                    onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save Reward'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
