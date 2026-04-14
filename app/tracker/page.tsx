import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import EmployeeSidebar from '@/components/employee-sidebar';
import EmployeeTracker from '@/components/employee-tracker';

export default async function TrackerPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  if (user.role === 'admin' || user.role === 'manager') {
    return <AdminLayout><EmployeeTracker /></AdminLayout>;
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <EmployeeSidebar />
      <div className="md:ml-64 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <EmployeeTracker />
        </div>
      </div>
    </div>
  );
}
