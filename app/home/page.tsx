import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import MyAttendance from '@/components/my-attendance';

export default async function HomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'admin' || user.role === 'manager') redirect('/command-center');
  redirect('/dashboard');
}