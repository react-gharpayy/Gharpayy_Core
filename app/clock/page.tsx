import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import EmployeeNav from '@/components/employee-nav';
import EmployeeDetail from '@/components/employee-detail';

export default async function ClockPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'employee') redirect('/');

  return (
    <div
      className="min-h-screen bg-gray-50 pb-20 md:pb-0"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-lg font-bold text-orange-500">Gharpayy</span>
          </div>
        </div>
      </header>

      <div className="hidden md:block">
        <EmployeeNav />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Attendance</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long',
              timeZone: 'Asia/Kolkata',
            })}
          </p>
        </div>

        {/* Full attendance detail — clock in/out, timeline, stats */}
        <EmployeeDetail />
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { label: 'Home',       href: '/home',           icon: '🏠' },
            { label: 'Attendance', href: '/clock',          icon: '🕐' },
            { label: 'Profile',    href: '/profile',        icon: '👤' },
            { label: 'Notices',    href: '/notices',        icon: '🔔' },
          ].map(tab => (
            <a
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
                tab.href === '/clock'
                  ? 'text-orange-500'
                  : 'text-gray-400'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}