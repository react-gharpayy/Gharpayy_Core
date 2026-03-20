import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import EmployeeNav from '@/components/employee-nav';
import EmployeeHome from '@/components/employee-home';

export default async function ClockPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'employee') redirect('/');

  return (
    <>
      <EmployeeNav />
      <EmployeeHome user={user} />
    </>
  );
}
