import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import Header from '@/components/header';
import EmployeeDetail from '@/components/employee-detail';

export default async function EmployeeDetailPage({
  searchParams,
}: {
  searchParams?: { employeeId?: string; employeeid?: string };
}) {
  const user = await getAuthUser();

  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        <EmployeeDetail employeeId={searchParams?.employeeId || searchParams?.employeeid} />
      </div>
    </main>
  );
}
