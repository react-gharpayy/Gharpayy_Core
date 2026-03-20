import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import Header from '@/components/header';
import AdminNav from '@/components/admin-nav';
import AdminApprovals from '@/components/admin-approvals';
import EmployeeManager from '@/components/employee-manager';

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        <AdminApprovals />
      </div>
    </main>
  );
}
