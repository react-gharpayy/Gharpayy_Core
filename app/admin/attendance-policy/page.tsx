import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

export default async function AdminAttendancePolicyRedirect() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  if (user.role !== 'admin') redirect('/command-center');
  redirect('/admin/settings?tab=attendance-policy');
}
