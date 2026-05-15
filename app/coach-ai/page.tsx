import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import CoachAI from '@/modules/coach-ai/components/CoachAI';

export const metadata = {
  title: 'Coach AI Intelligence | Gharpayy',
  description: 'Enterprise operational intelligence and executive diagnostics.',
};

export default async function CoachAIPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  // Operational intelligence is restricted to administrative/management tiers
  const ALLOWED_ROLES = ['admin', 'manager', 'hr', 'team_lead', 'sub_admin'];
  const userRole = user.systemRole || user.role;
  
  if (!ALLOWED_ROLES.includes(userRole)) {
    redirect('/dashboard');
  }

  return (
    <AdminLayout>
      <div className="bg-[#f8f9fa] min-h-[calc(100vh-64px)]">
        <div className="max-w-6xl mx-auto px-4 py-8 md:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Coach AI</h1>
            <p className="text-gray-500 mt-1 font-medium">Enterprise Operational Intelligence & Executive Diagnostics</p>
          </div>
          
          <CoachAI />
        </div>
      </div>
    </AdminLayout>
  );
}
