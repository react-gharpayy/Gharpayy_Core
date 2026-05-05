'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Home, Clock, User, Bell, Calendar } from 'lucide-react';

const EMPLOYEE_TABS = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'My Attendance', href: '/clock', icon: Clock },
  { label: 'My Leaves', href: '/my-leaves', icon: Calendar },
  { label: 'My Profile', href: '/profile', icon: User },
  { label: 'Notices', href: '/notices', icon: Bell },
];

interface EmployeeNavProps {
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  showMobileTopBar?: boolean;
}

export default function EmployeeNav({
  mobileMenuOpen,
  onToggleMobileMenu,
  showMobileTopBar = true,
}: EmployeeNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);

  const controlled = typeof mobileMenuOpen === 'boolean';
  const menuOpen = controlled ? mobileMenuOpen : internalMenuOpen;

  const toggleMenu = () => {
    if (controlled) {
      onToggleMobileMenu?.();
      return;
    }
    setInternalMenuOpen((v) => !v);
  };

  const closeMenu = () => {
    if (controlled) {
      if (menuOpen) onToggleMobileMenu?.();
      return;
    }
    setInternalMenuOpen(false);
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <div className={`md:hidden ${showMobileTopBar ? 'bg-white border-b border-gray-200' : ''}`}>
        {showMobileTopBar && (
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-semibold text-gray-800">Menu</h2>
            <button onClick={toggleMenu} className="text-gray-600 hover:text-gray-800" aria-label="Toggle menu">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        )}

        {menuOpen && (
          <div className={`${showMobileTopBar ? 'border-t border-gray-200' : 'border-b border-gray-200'} bg-white`}>
            {EMPLOYEE_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.href);
              return (
                <button
                  key={tab.href}
                  onClick={() => {
                    router.push(tab.href);
                    closeMenu();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                    active
                      ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 md:px-6">
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {EMPLOYEE_TABS.map((tab) => (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition border-b-2 ${
                  isActive(tab.href)
                    ? 'text-orange-500 border-orange-500'
                    : 'text-gray-700 border-transparent hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
