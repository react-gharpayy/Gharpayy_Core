import AdminSidebar from '@/components/admin-sidebar';
import EmployeeSidebar from '@/components/employee-sidebar';
import { getAuthUser } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const isHR = user?.role === 'hr';

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col md:block" style={{ background: '#f8f9fa' }}>
      {isHR ? <EmployeeSidebar /> : <AdminSidebar />}
      <div className="h-full overflow-y-auto md:ml-64">
        <div className="max-w-6xl mx-auto px-4 pt-20 md:pt-8 pb-24 md:pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}

