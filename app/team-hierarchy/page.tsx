import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import TeamHierarchy from '@/components/team-hierarchy';

export default async function TeamHierarchyPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  return <AdminLayout><TeamHierarchy /></AdminLayout>;
}