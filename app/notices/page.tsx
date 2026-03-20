import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import EmployeeNav from '@/components/employee-nav';
import NoticesEmployee from '@/components/notices-employee';

export default async function NoticesPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  if (user.role === 'employee') {
    return (
      <>
        <EmployeeNav />
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
            <NoticesEmployee />
          </div>
        </main>
      </>
    );
  }

  // Admin view for managing notices (existing behavior)
  return (
    <main className="min-h-screen bg-gray-50">
      <NoticesEmployee />
    </main>
  );
}