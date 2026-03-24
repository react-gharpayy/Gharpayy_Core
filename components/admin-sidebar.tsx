'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, BarChart2, ClipboardList,
  Bell, GitBranch, CheckSquare, FileText, LogOut, Menu, X
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'DEMAND',
    items: [
      { label: 'Command Center', href: '/command-center', icon: LayoutDashboard },
      { label: 'Live Attendance', href: '/live-attendance', icon: Users },
      { label: 'Task Board', href: '/task-board', icon: ClipboardList },
      { label: 'Notices', href: '/notices', icon: Bell },
      { label: 'KPIs & KRAs', href: '/kpis', icon: BarChart2 },
    ],
  },
  {
    label: 'SUPPLY',
    items: [
      { label: 'Team Hierarchy', href: '/team-hierarchy', icon: GitBranch },
      { label: 'Approvals', href: '/approvals', icon: CheckSquare },
      { label: 'Reports', href: '/reports', icon: FileText },
    ],
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [noticeCount, setNoticeCount] = useState(0);
  const [approvalCount, setApprovalCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.id || d.email) setUser(d);
      })
      .catch(() => {});
    fetch('/api/exceptions?status=pending', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.pendingCount !== undefined) setApprovalCount(d.pendingCount);
      })
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isActive = (href: string) =>
    href === '/command-center' ? pathname === '/command-center' || pathname === '/' : pathname.startsWith(href);

  const getBadge = (href: string) => {
    if (href === '/approvals') return approvalCount;
    if (href === '/notices') return noticeCount;
    return 0;
  };

  const flatItems = NAV_GROUPS.flatMap(group => group.items);

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 min-h-screen fixed left-0 top-0 z-40 bg-white border-r border-gray-200">
        <div className="px-5 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-orange-500">G</div>
            <div>
              <div className="text-sm font-bold text-gray-900 leading-tight">Gharpayy</div>
              <div className="text-[11px] text-gray-700">Booking OS</div>
            </div>
          </div>
          <div className="text-xs text-gray-700 mt-3">Gharpayy - Booking OS</div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-4 last:mb-0">
              <div className="px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-gray-400">{group.label}</div>
              <div className="space-y-1">
                {group.items.map(item => {
                  const active = isActive(item.href);
                  const badge = getBadge(item.href);
                  return (
                    <button
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition border-l-2"
                      style={{
                        borderLeftColor: active ? '#f97316' : 'transparent',
                        background: active ? '#fff7ed' : 'transparent',
                        color: active ? '#f97316' : '#374151',
                      }}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#f97316' : '#6b7280' }} />
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {initials(user.fullName || user.email)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-800 truncate">{user.fullName || 'Admin'}</div>
                <div className="text-[11px] text-gray-700 truncate">{user.email || ''}</div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-700"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-orange-500">G</div>
          <div className="text-sm font-semibold text-gray-900">Gharpayy - Booking OS</div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <button
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu overlay"
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-orange-500">G</div>
                <div className="text-sm font-semibold text-gray-900">Gharpayy - Booking OS</div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-700"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
              {NAV_GROUPS.map(group => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <div className="px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-gray-400">{group.label}</div>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const active = isActive(item.href);
                      const badge = getBadge(item.href);
                      return (
                        <button
                          key={item.href}
                          onClick={() => {
                            router.push(item.href);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition border-l-2"
                          style={{
                            borderLeftColor: active ? '#f97316' : 'transparent',
                            background: active ? '#fff7ed' : 'transparent',
                            color: active ? '#f97316' : '#374151',
                          }}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#f97316' : '#6b7280' }} />
                          <span className="text-sm font-medium flex-1">{item.label}</span>
                          {badge > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">{badge}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-gray-200 space-y-2">
              {user && (
                <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {initials(user.fullName || user.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-800 truncate">{user.fullName || 'Admin'}</div>
                    <div className="text-[11px] text-gray-700 truncate">{user.email || ''}</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 bg-white border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {flatItems.slice(0, 5).map(item => {
          const active = isActive(item.href);
          const badge = getBadge(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex flex-col items-center justify-center gap-0.5 py-3 relative"
              style={{ color: active ? '#f97316' : '#6b7280' }}
            >
              {badge > 0 && (
                <span className="absolute top-1.5 right-3 text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center bg-red-500 text-white">{badge}</span>
              )}
              <item.icon className="w-4 h-4" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[9px] font-medium">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      <div className="md:hidden h-14" />
    </>
  );
}


