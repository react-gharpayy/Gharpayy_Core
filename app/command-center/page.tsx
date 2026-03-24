import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import CommandCenter from '@/components/command-center';

export default async function CommandCenterPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  return (
    <AdminLayout>
      <CommandCenter />
    </AdminLayout>
  );
}