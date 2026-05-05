import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import AdminWeeklyTrackerDetail from '@/components/admin-daily-tracker-detail';

export default async function AdminWeeklyTrackerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/weekly-tracker');
  const { id } = await params;

  return (
    <AdminLayout>
      <AdminWeeklyTrackerDetail employeeId={id} />
    </AdminLayout>
  );
}
