import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import EmployeeNav from '@/components/employee-nav';
import EmployeeDetail from '@/components/employee-detail';

export default async function ClockPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  // Admin / Manager €” show attendance detail with header and nav
  if (user.role === 'admin' || user.role === 'manager') {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-800">ARENA OS - Clock In / Clock Out</h1>
            <p className="text-sm text-gray-700 mt-1">Mark your own attendance</p>
          </div>
          <EmployeeDetail />
        </div>
      </main>
    );
  }

  // Employee €” show with employee nav
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Gharpayy</div>
              <div className="text-sm font-bold text-orange-500">ARENA OS</div>
            </div>
          </div>
        </div>
      </header>

      <div className="hidden md:block">
        <EmployeeNav />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ARENA OS - My Attendance</h1>
          <p className="text-gray-700 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long',
              timeZone: 'Asia/Kolkata',
            })}
          </p>
        </div>
        <EmployeeDetail />
      </div>
    </div>
  );
}
