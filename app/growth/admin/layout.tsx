import React from 'react';
import AdminLayout from '@/components/admin-layout';

export default function GrowthAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
