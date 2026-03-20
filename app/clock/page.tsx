import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import EmployeeHome from '@/components/employee-home';

export default async function ClockPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'employee') redirect('/');

  return <EmployeeHome user={user} />;
}
