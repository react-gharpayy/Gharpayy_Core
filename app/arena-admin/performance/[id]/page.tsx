import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import PerformanceDashboard from '@/components/arena/PerformanceDashboard';

export default async function PerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'hr') redirect('/home');

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <PerformanceDashboard operatorId={id} />
      </div>
    </AdminLayout>
  );
}
