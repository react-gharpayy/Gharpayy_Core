import AdminSidebar from '@/components/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <AdminSidebar />
      <div className="md:ml-64">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}

