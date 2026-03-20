'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Users } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isAdmin = user?.role === 'admin';
  const isEmployeesActive = pathname === '/admin';

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Gharpayy" className="h-10 w-auto"
            onError={e => { (e.target as any).style.display='none'; }} />
        </div>
        {isAdmin && (
          <button onClick={() => router.push('/admin')}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full transition ${
              isEmployeesActive
                ? 'bg-orange-500 text-white'
                : 'bg-orange-50 text-orange-500 hover:bg-orange-100 border border-orange-200'
            }`}>
            <Users className="w-4 h-4" />
            Employees
          </button>
        )}
        <button onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition border border-gray-200 rounded-lg px-3 py-1.5">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
