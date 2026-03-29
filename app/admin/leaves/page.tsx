'use client';

import { useEffect, useState, useCallback } from 'react';

type Leave = {
  _id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  isHalfDay: boolean;
  createdAt: string;
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: 'Casual',
  sick: 'Sick',
  earned: 'Earned',
  comp_off: 'Comp Off',
  lop: 'LOP',
  other: 'Other',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/leaves${params}`);
      const data = await res.json();
      if (data.ok) setLeaves(data.leaves);
    } catch {
      showToast('Failed to load leaves', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleAction = async (id: string, action: 'approved' | 'rejected', note?: string) => {
    setActionLoading(id + action);
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, adminNote: note || '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Action failed', 'error');
      } else {
        showToast(`Leave ${action} successfully`, 'success');
        fetchLeaves();
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const stats = {
    pending: leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
          <p className="text-gray-500 text-sm mt-1">Review and action employee leave requests</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Pending', count: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
            { label: 'Approved', count: stats.approved, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
            { label: 'Rejected', count: stats.rejected, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl p-4`}>
              <p className="text-xs font-semibold text-gray-500 uppercase">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.count}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5">
          {['pending', 'approved', 'rejected', ''].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'
              }`}
            >
              {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Applied On', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{leave.employeeName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
                        {leave.isHalfDay && <span className="ml-1 text-xs text-gray-400">(Half)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{leave.startDate}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{leave.endDate}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium text-center">{leave.totalDays}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate" title={leave.reason}>{leave.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[leave.status]}`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        {new Date(leave.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {leave.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(leave._id, 'approved')}
                              disabled={actionLoading === leave._id + 'approved'}
                              className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === leave._id + 'approved' ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleAction(leave._id, 'rejected')}
                              disabled={actionLoading === leave._id + 'rejected'}
                              className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === leave._id + 'rejected' ? '...' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
