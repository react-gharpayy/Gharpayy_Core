'use client';
/**
 * components/hierarchy/AddMemberModal.tsx
 *
 * Modal for managers to add a new team member directly.
 * Preserved from the original team-hierarchy.tsx — no regression.
 */

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddMemberModalProps {
  onClose: () => void;
  onAdded: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AddMemberModal({ onClose, onAdded, onError }: AddMemberModalProps) {
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [adding,   setAdding]   = useState(false);

  const handleAdd = async () => {
    if (!fullName.trim() || !email.trim() || !password) return;
    setAdding(true);
    try {
      const r = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email:    email.trim().toLowerCase(),
          password,
          role:     'employee',
        }),
      });
      const d = await r.json();
      if (d.ok) {
        onAdded('Team member added');
        onClose();
      } else {
        onError(d.error || 'Failed to add');
      }
    } catch {
      onError('Network error');
    }
    setAdding(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-gray-200 w-full max-w-md shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800">Add Team Member</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Satvik Sharma"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="satvik@gharpayy.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Password</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="Min 6 characters"
              minLength={6}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !fullName.trim() || !email.trim() || !password}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-2xl transition disabled:opacity-60 mt-2"
          >
            {adding ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
