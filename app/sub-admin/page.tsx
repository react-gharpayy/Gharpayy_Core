import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import Header from '@/components/header';
import SubAdminDashboard from '@/components/sub-admin-dashboard';

export default async function SubAdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'sub_admin') redirect('/');
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        <SubAdminDashboard
          assignedTeamId={user.assignedTeamId?.toString() || ''}
          userName={user.fullName}
        />
      </div>
    </main>
  );
}
