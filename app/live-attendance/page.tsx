// app/live-attendance/page.tsx
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import LiveAttendance from '@/components/live-attendance';

export default async function LiveAttendancePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  return <AdminLayout><LiveAttendance /></AdminLayout>;
}