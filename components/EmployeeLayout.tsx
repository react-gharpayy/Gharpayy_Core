'use client';

import React from 'react';
import EmployeeSidebar from '@/components/employee-sidebar';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <EmployeeSidebar />
      <div className="md:ml-64">
        <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 pb-24 md:pb-12">
          {children}
        </div>
      </div>
    </div>
  );
}
