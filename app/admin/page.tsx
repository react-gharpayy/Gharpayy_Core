import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import PendingApprovalsBadge from '@/components/pending-approvals-badge';
import EmployeeManager from '@/components/employee-manager';
import AdminLayout from '@/components/admin-layout';

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');
  return (
    <AdminLayout>
      <div className="space-y-6">
        <PendingApprovalsBadge />
        <EmployeeManager />
      </div>
    </AdminLayout>
  );
}
