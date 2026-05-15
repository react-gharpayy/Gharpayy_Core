import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import EmployeeSidebar from '@/components/employee-sidebar';
import CoachingDashboard from '@/components/coaching/CoachingDashboard';
import EmployeeCoaching from '@/components/coaching/EmployeeCoaching';

export default async function CoachingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  if (user.role === 'employee') {
    return (
      <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
        <EmployeeSidebar />
        <div className="md:ml-64 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <EmployeeCoaching />
          </div>
        </div>
      </div>
    );
  }

  // admin/manager
  return (
    <AdminLayout>
      <CoachingDashboard />
    </AdminLayout>
  );
}
