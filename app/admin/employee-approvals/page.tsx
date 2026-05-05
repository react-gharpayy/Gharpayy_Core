import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import AdminApprovals from '@/components/admin-approvals';

export default async function EmployeeApprovalsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');
  return (
    <AdminLayout>
      <AdminApprovals />
    </AdminLayout>
  );
}