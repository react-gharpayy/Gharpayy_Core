import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import AdminSettingsTabs from '@/components/admin-settings-tabs';

export default async function AdminSettingsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  if (user.role !== 'admin') redirect('/command-center');

  return (
    <AdminLayout>
      <div className="space-y-4 py-6 px-4 md:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage all admin configuration from one consolidated page.</p>
        </div>
        <AdminSettingsTabs initialTab={searchParams?.tab || 'general'} />
      </div>
    </AdminLayout>
  );
}
