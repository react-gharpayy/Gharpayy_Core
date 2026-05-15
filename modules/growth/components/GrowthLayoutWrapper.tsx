'use client';

import React, { useEffect, useState } from 'react';
import EmployeeLayout from '@/components/EmployeeLayout';
import AdminSidebar from '@/components/admin-sidebar';
import EmployeeSidebar from '@/components/employee-sidebar';

export default function GrowthLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.id || d.email) setUser(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-orange-200 rounded-2xl" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  if (isAdmin) {
    return (
      <div className="h-[100dvh] overflow-hidden flex flex-col md:block" style={{ background: '#f8f9fa' }}>
        <AdminSidebar />
        <div className="h-full overflow-y-auto md:ml-64">
          <div className="max-w-6xl mx-auto px-4 pt-20 md:pt-8 pb-24 md:pb-8">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return <EmployeeLayout>{children}</EmployeeLayout>;
}
