'use client';
import { useEffect, useState } from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PendingApprovalsBadge() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/employees/approvals?status=pending')
      .then(r => r.json())
      .then(d => {
        if (d.ok && Array.isArray(d.employees)) {
          setCount(d.employees.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 p-6">
        <div className="animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => router.push('/admin/employee-approvals')}
      className="bg-white rounded-3xl border border-gray-200 p-6 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {count} Pending Approvals
            </p>
            <p className="text-xs text-gray-600">Employee account approvals</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}