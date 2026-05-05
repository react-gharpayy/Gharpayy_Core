import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import HolidayManager from '@/components/holiday-manager';

export default async function HolidaysPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  if (user.role !== 'admin') redirect('/command-center');
  return (
    <AdminLayout>
      <HolidayManager />
    </AdminLayout>
  );
}
