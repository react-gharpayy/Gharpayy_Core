'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, BarChart2, ClipboardList, ClipboardCheck,
  Bell, GitBranch, CheckSquare, FileText, LogOut, Menu, X, Settings, UserRound, Calendar, Heart, Target, Lightbulb, Sparkles, ShieldCheck, Trophy, ShoppingBag
} from 'lucide-react';
import { getCurrentWeekInfo } from '@/lib/week-utils';
import GiveKudoModal from '@/components/GiveKudoModal';
import { NotificationBell } from '@/modules/notifications/components/NotificationBell';
import { cn } from '@/lib/utils';

const isActiveRoute = (pathname: string, href: string, exact = false) => {
  if (exact) return pathname === href;
  if (href === '/command-center') return pathname === '/command-center' || pathname === '/';
  // Ensure that if we're matching a parent route, it doesn't accidentally match sub-routes that have their own nav items
  if (href === '/admin') return pathname === '/admin'; // Exact match for employee management
  if (href === '/growth/admin') return pathname === '/growth/admin'; // Exact match for growth governance
  
  return pathname === href || pathname.startsWith(href + '/');
};

const NAV_ITEMS = [
  { label: 'Workforce Overview', href: '/command-center', icon: LayoutDashboard },
  { label: 'Arena Management', href: '/arena-admin', icon: Target },
  { label: 'Attendance Management', href: '/live-attendance', icon: Users },
  { label: 'Task Management Console', href: '/task-board', icon: ClipboardList },
  { label: 'Daily Updates', href: '/admin/tracker', icon: ClipboardList },
  { label: 'Weekly Tracker', href: '/admin/daily-tracker', icon: ClipboardCheck },
  { label: 'Announcements Hub', href: '/notices', icon: Bell },
  { label: 'Performance Analytics', href: '/kpis', icon: BarChart2 },
  { label: 'Team Hierarchy', href: '/team-hierarchy', icon: GitBranch },
  { label: 'Approval Center', href: '/approvals', icon: CheckSquare },
  { label: '1:1 Sessions', href: '/coaching', icon: Lightbulb },
  { label: 'Coach AI', href: '/coach-ai', icon: Sparkles },
  { label: 'Growth Governance', href: '/growth/admin', icon: ShieldCheck, exact: true },
  { label: 'Leaderboard', href: '/growth/leaderboard', icon: Trophy },
  { label: 'Reward Management', href: '/growth/admin/rewards', icon: ShoppingBag },
  { label: 'Quest Management', href: '/growth/admin/quests', icon: Target },
  { label: 'Economy Analytics', href: '/growth/admin/analytics', icon: BarChart2 },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Employee Management', href: '/admin', icon: Users, exact: true },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Holiday Calendar', href: '/holidays', icon: Calendar },
  { label: 'Employee Profile', href: '/employee-profile', icon: UserRound },
  { label: 'Kudos', href: '/kudos', icon: Heart },
];

const MANAGER_ALLOWED = new Set([
  '/command-center',
  '/live-attendance',
  '/task-board',
  '/admin/tracker',
  '/admin/daily-tracker',
  '/approvals',
  '/notices',
  '/team-hierarchy',
  '/kpis',
  '/kudos',
  '/arena-admin',
  '/coaching',
  '/coach-ai',
  '/growth/admin',
  '/growth/admin/rewards',
  '/growth/admin/quests',
  '/growth/admin/analytics',
  '/growth/leaderboard',
]);

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
  const [isKudoModalOpen, setIsKudoModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

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

  const isActive = (href: string, exact = false) => isActiveRoute(pathname, href, exact);

  const getBadge = (href: string) => {
    if (href === '/approvals') return approvalCount;
    if (href === '/notices') return noticeCount;
    return 0;
  };

  const flatItems = (user?.role === 'manager'
    ? NAV_ITEMS.filter(item => MANAGER_ALLOWED.has(item.href))
    : NAV_ITEMS
  ).filter(item => {
    const isGrowthAdmin = item.href === '/growth/admin';
    if (isGrowthAdmin) return user?.growthEngineEnabled || process.env.NEXT_PUBLIC_ENABLE_GROWTH_ENGINE === 'true';
    return true;
  });

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 z-40 bg-white border-r border-gray-200 overflow-hidden">
        <div className="px-5 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Gharpayy" className="w-12 h-12 rounded-xl object-cover" />
              <div>
                <div className="text-sm font-bold text-gray-900 leading-tight">Gharpayy</div>
                <div className="text-[11px] text-orange-500 font-semibold uppercase tracking-wider">Arena OS</div>
              </div>
            </div>
            <NotificationBell />
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Navigation Control</div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <nav className="px-3 py-4">
            <div className="space-y-1">
              {flatItems.map(item => {
                const active = isActive(item.href, (item as any).exact);
                const badge = getBadge(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative"
                    style={{
                      background: active ? '#fff7ed' : 'transparent',
                      color: active ? '#f97316' : '#374151',
                    }}
                  >
                    {active && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-orange-500 rounded-r-full" />
                    )}
                    <item.icon 
                      className={cn(
                        "w-4 h-4 flex-shrink-0 transition-colors",
                        active ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"
                      )} 
                    />
                    <span className={cn(
                      "text-sm font-medium flex-1 truncate",
                      active ? "font-bold" : "font-medium"
                    )}>
                      {item.label}
                    </span>
                    {badge > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">{badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 space-y-3 bg-white pb-8">
          <button
            onClick={() => setIsKudoModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-all border border-orange-200/50 group"
          >
            <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform">
              <Heart className="w-3 h-3 text-orange-500 fill-orange-500" />
            </div>
            <span>Give a kudo</span>
          </button>
          
          {user ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 hover:bg-gray-50 transition-colors cursor-default">
              <div className="w-9 h-9 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center flex-shrink-0 shadow-sm shadow-orange-200 ring-2 ring-white">
                {initials(user.fullName || user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-900 truncate">{user.fullName || 'Admin User'}</div>
                <div className="text-[10px] text-gray-400 font-medium truncate">{user.email || 'gharpayy.com'}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/30 px-3 py-2 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-2 w-20 bg-gray-200 rounded" />
                <div className="h-1.5 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          )}
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <GiveKudoModal 
        isOpen={isKudoModalOpen} 
        onClose={() => setIsKudoModalOpen(false)} 
        onSuccess={() => {}} 
        initialEmployees={employees}
      />

      <div className="md:hidden fixed top-0 left-0 right-0 z-[45] bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 h-16 flex items-center">
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-700 bg-white shadow-sm active:scale-95 transition-all"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="/logo.png" alt="Gharpayy" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
          <div className="flex flex-col">
            <div className="text-sm font-black text-gray-900 leading-tight">Gharpayy</div>
            <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">Arena OS</div>
          </div>
          <div className="flex-1" />
          <NotificationBell />
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
                <img src="/logo.png" alt="Gharpayy" className="w-8 h-8 rounded-lg object-cover" />
                <div className="text-sm font-semibold text-gray-900">Gharpayy - ARENA OS</div>
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
              <div className="space-y-1">
                {flatItems.map(item => {
                  const active = isActive(item.href, (item as any).exact);
                  const badge = getBadge(item.href);
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        router.push(item.href);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative"
                      style={{
                        background: active ? '#fff7ed' : 'transparent',
                        color: active ? '#f97316' : '#374151',
                      }}
                    >
                      {active && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-orange-500 rounded-r-full" />
                      )}
                      <item.icon 
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          active ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"
                        )} 
                      />
                      <span className={cn(
                        "text-sm font-medium flex-1 truncate",
                        active ? "font-bold" : "font-medium"
                      )}>
                        {item.label}
                      </span>
                      {badge > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
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

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {flatItems.slice(0, 5).map(item => {
          const active = isActive(item.href, (item as any).exact);
          const badge = getBadge(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex flex-col items-center justify-center gap-0.5 py-3 relative"
              style={{ color: active ? '#f97316' : '#94a3b8' }}
            >
              {badge > 0 && (
                <span className="absolute top-1.5 right-3 text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center bg-red-500 text-white animate-pulse shadow-sm">{badge}</span>
              )}
              <item.icon className="w-4 h-4 transition-transform active:scale-90" strokeWidth={active ? 2.5 : 2} />
              <span className={cn(
                "text-[9px] transition-all",
                active ? "font-black uppercase tracking-tighter" : "font-medium"
              )}>
                {item.label.split(' ')[0]}
              </span>
              {active && (
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="md:hidden h-14" />
    </>
  );
}


