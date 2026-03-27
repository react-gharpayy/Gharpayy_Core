'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Users, BarChart3, UserCog } from 'lucide-react';

const ADMIN_TABS = [
  { label: 'Approvals', href: '/admin', icon: Users },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Sub-Admins', href: '/admin/sub-admins', icon: UserCog },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Desktop – horizontal tabs (hidden on mobile) */}
      <div className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 md:px-6">
          <div className="flex gap-1">
            {ADMIN_TABS.map(tab => (
              <button key={tab.href} onClick={() => router.push(tab.href)}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition border-b-2 ${
                  isActive(tab.href)
                    ? 'text-orange-500 border-orange-500'
                    : 'text-gray-700 border-transparent hover:text-gray-800'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile – hamburger menu */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-semibold text-gray-800">Admin Panel</h2>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-600 hover:text-gray-800">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="border-t border-gray-200 bg-white">
            {ADMIN_TABS.map(tab => {
              const Icon = tab.icon;
              const active = isActive(tab.href);
              return (
                <button key={tab.href}
                  onClick={() => { router.push(tab.href); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition${
                    active
                      ? ' bg-orange-50 text-orange-600 border-l-4 border-orange-500'
                      : ' text-gray-700 hover:bg-gray-50'
                  }`}>
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
