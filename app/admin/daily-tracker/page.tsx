import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import AdminWeeklyTracker from '@/components/admin-daily-tracker';

export default async function AdminWeeklyTrackerPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/weekly-tracker');

  return <AdminLayout><AdminWeeklyTracker /></AdminLayout>;
}

