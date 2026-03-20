import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import EmployeeHome from '@/components/employee-home';

export default async function HomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  // Managers go to main dashboard
  if (user.role === 'admin' || user.role === 'manager') redirect('/');
  return <EmployeeHome user={user} />;
}
