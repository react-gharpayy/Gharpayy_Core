import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import Dashboard from '@/components/dashboard/Dashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Gharpayy ARENA OS',
  description: 'Your personal operational workspace',
};

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  // Only employees use this dashboard.
  // Admins, managers, hr, sub_admins go to their command center.
  const NON_EMPLOYEE_ROLES = ['admin', 'manager', 'hr', 'sub_admin'];
  if (NON_EMPLOYEE_ROLES.includes(user.role)) {
    redirect('/command-center');
  }

  return <Dashboard />;
}
