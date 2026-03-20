'use client';
import { useRouter, usePathname } from 'next/navigation';
import { BarChart2, List, PieChart, MapPin, Clock, Bell } from 'lucide-react';

const TABS = [
  { label: 'Heatmap',      href: '/',                icon: BarChart2 },
  { label: "Today's Log",  href: '/todays-log',      icon: List },
  { label: 'Coverage',     href: '/coverage-summary',icon: PieChart },
  { label: 'Geo-Fence',    href: '/geo-fence',       icon: MapPin },
  { label: 'Clock In/Out', href: '/clock',           icon: Clock },
  { label: 'Notices',      href: '/notices',         icon: Bell },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Desktop — horizontal tabs (hidden on mobile) */}
      <div className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 md:px-6">
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(tab => (
              <button key={tab.href} onClick={() => router.push(tab.href)}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition border-b-2 ${
                  isActive(tab.href)
                    ? 'text-orange-500 border-orange-500'
                    : 'text-gray-500 border-transparent hover:text-gray-800'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile — bottom navigation bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-6 h-16">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <button key={tab.href} onClick={() => router.push(tab.href)}
                className={`flex flex-col items-center justify-center gap-0.5 transition ${
                  active ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
                }`}>
                <div className={`p-1.5 rounded-xl transition ${active ? 'bg-orange-50' : ''}`}>
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.6} />
                </div>
                <span className={`text-[9px] font-medium leading-none ${active ? 'text-orange-500' : 'text-gray-400'}`}>
                  {tab.label.replace("Today's ", '').replace(' In/Out', '')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile bottom padding so content isn't hidden behind nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
