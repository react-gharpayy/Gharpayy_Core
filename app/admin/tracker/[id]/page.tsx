import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import AdminTrackerDetail from '@/components/admin-tracker-detail';

export default async function AdminTrackerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  const { id } = await params;
  return (
    <AdminLayout>
      <AdminTrackerDetail employeeId={id} />
    </AdminLayout>
  );
}
