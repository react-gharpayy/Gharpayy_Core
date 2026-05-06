import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import KPIsDashboard from '@/components/kpis-dashboard';

export default async function KPIsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (!['admin', 'manager', 'hr'].includes(user.role)) redirect('/my-performance');
  return <AdminLayout><KPIsDashboard /></AdminLayout>;
}