import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import AdminTracker from '@/components/admin-tracker';

export default async function AdminTrackerPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  return <AdminLayout><AdminTracker /></AdminLayout>;
}
