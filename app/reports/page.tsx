import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import Reports from '@/components/reports';

export default async function ReportsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  if (user.role !== 'admin') redirect('/command-center');
  return <AdminLayout><Reports /></AdminLayout>;
}
