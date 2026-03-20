'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader, AlertCircle, Edit2 } from 'lucide-react';

interface Employee {
  _id: string;
  fullName: string;
  email: string;
  dateOfBirth: string;
  jobRole: string;
  isApproved: boolean;
  officeZoneId?: { _id: string; name: string };
  profilePhoto?: string;
  createdAt: string;
}

export default function AdminApprovals() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [approving, setApproving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ jobRole: '', officeZoneId: '' });
  const [zones, setZones] = useState<any[]>([]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const status = activeTab === 'pending' ? 'pending' : 'approved';
      const res = await fetch(`/api/employees/approvals?status=${status}`);
      const data = await res.json();
      if (data.ok) setEmployees(data.employees);
      setError('');
    } catch {
      setError('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/zones');
      const data = await res.json();
      if (data.ok) setZones(data.zones);
    } catch { }
  };

  useEffect(() => {
    fetchEmployees();
    fetchZones();
  }, [activeTab]);

  const handleApprove = async (employeeId: string) => {
    setApproving(employeeId);
    try {
      const res = await fetch('/api/employees/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, action: 'approve' }),
      });
      if (res.ok) {
        setEmployees(e => e.filter(emp => emp._id !== employeeId));
      }
    } catch {
      alert('Failed to approve');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (employeeId: string) => {
    if (!confirm('Are you sure you want to reject this employee?')) return;
    setApproving(employeeId);
    try {
      const res = await fetch('/api/employees/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, action: 'reject' }),
      });
      if (res.ok) {
        setEmployees(e => e.filter(emp => emp._id !== employeeId));
      }
    } catch {
      alert('Failed to reject');
    } finally {
      setApproving(null);
    }
  };

  const handleEdit = async (employeeId: string) => {
    try {
      const res = await fetch('/api/employees/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          jobRole: editData.jobRole || undefined,
          officeZoneId: editData.officeZoneId || undefined,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchEmployees();
      }
    } catch {
      alert('Failed to update employee');
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
            activeTab === 'pending'
              ? 'text-orange-500 border-orange-500'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}>
          Pending Approval
        </button>
        <button onClick={() => setActiveTab('approved')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
            activeTab === 'approved'
              ? 'text-orange-500 border-orange-500'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}>
          Approved Employees
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No {activeTab} employees</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => (
            <div key={emp._id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition">
              <div className="flex items-start gap-4">
                {/* Photo */}
                {emp.profilePhoto && (
                  <img src={emp.profilePhoto} alt={emp.fullName} className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm">{emp.fullName}</h3>
                      <p className="text-xs text-gray-500">{emp.email}</p>
                    </div>
                    {emp.isApproved && <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">Approved</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <p className="text-gray-500">DOB</p>
                      <p className="font-medium text-gray-700">{emp.dateOfBirth}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Role</p>
                      {editingId === emp._id ? (
                        <select value={editData.jobRole} onChange={e => setEditData({ ...editData, jobRole: e.target.value })} className="text-xs border border-gray-200 rounded px-2 py-1">
                          <option value="">Select</option>
                          <option value="full-time">Full-time</option>
                          <option value="intern">Intern</option>
                        </select>
                      ) : (
                        <p className="font-medium text-gray-700 capitalize">{emp.jobRole || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500">Zone</p>
                      {editingId === emp._id ? (
                        <select value={editData.officeZoneId} onChange={e => setEditData({ ...editData, officeZoneId: e.target.value })} className="text-xs border border-gray-200 rounded px-2 py-1">
                          <option value="">Select</option>
                          {zones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
                        </select>
                      ) : (
                        <p className="font-medium text-gray-700">{emp.officeZoneId?.name || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500">Applied</p>
                      <p className="font-medium text-gray-700">{new Date(emp.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 ml-18">
                {!emp.isApproved ? (
                  <>
                    <button onClick={() => handleApprove(emp._id)} disabled={approving === emp._id}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-lg font-medium text-sm hover:bg-green-100 disabled:opacity-50 transition">
                      {approving === emp._id ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve
                    </button>
                    <button onClick={() => handleReject(emp._id)} disabled={approving === emp._id}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-700 py-2 rounded-lg font-medium text-sm hover:bg-red-100 disabled:opacity-50 transition">
                      {approving === emp._id ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Reject
                    </button>
                  </>
                ) : (
                  editingId === emp._id ? (
                    <>
                      <button onClick={() => handleEdit(emp._id)}
                        className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-medium text-sm hover:bg-orange-600 transition">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-300 transition">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(emp._id); setEditData({ jobRole: emp.jobRole, officeZoneId: emp.officeZoneId?._id || '' }); }}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2 rounded-lg font-medium text-sm hover:bg-blue-100 transition">
                        <Edit2 className="w-4 h-4" />
                        Edit Details
                      </button>
                      <button onClick={() => handleReject(emp._id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-700 py-2 rounded-lg font-medium text-sm hover:bg-red-100 transition">
                        <XCircle className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
