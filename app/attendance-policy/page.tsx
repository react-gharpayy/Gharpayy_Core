import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import AttendancePolicySettings from '@/components/attendance-policy-settings';

export default async function AttendancePolicyPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  if (user.role !== 'admin') redirect('/command-center');
  return (
    <AdminLayout>
      <AttendancePolicySettings />
    </AdminLayout>
  );
}
