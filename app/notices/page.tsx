import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import EmployeeSidebar from '@/components/employee-sidebar';
import NoticesPage from '@/components/notices-dark';

export default async function Notices() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  if (user.role === 'employee') {
    return (
      <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
        <EmployeeSidebar />
        <div className="md:ml-64 pb-24 md:pb-8">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <NoticesPage isAdmin={false} />
          </div>
        </div>
      </div>
    );
  }

  return <AdminLayout><NoticesPage isAdmin={true} /></AdminLayout>;
}



