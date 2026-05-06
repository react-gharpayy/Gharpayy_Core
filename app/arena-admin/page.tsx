import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import ArenaAdmin from '@/components/arena/ArenaAdmin';

export default async function ArenaAdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'hr') redirect('/home');

  return (
    <AdminLayout>
      <ArenaAdmin />
    </AdminLayout>
  );
}
