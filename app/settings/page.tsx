import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import EmployeeSidebar from '@/components/employee-sidebar';
import WorkScheduleSettings from '@/components/work-schedule-settings';
import WeeklyTrackerSettings from '@/components/daily-tracker-settings';
import CrmIntegrationSettings from '@/components/crm-integration-settings';

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  if (user.role === 'manager') {
    redirect('/command-center');
  }

  if (user.role === 'admin') {
    redirect('/admin/settings?tab=general');
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <EmployeeSidebar />
      <div className="md:ml-64 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <WorkScheduleSettings />
        </div>
      </div>
    </div>
  );
}
