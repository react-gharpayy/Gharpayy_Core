'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SessionHeartbeat() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // No heartbeat on login/signup pages
    if (pathname === '/login' || pathname === '/signup') return;

    const pulse = async () => {
      try {
        const res = await fetch('/api/auth/heartbeat', { method: 'POST' });
        if (res.status === 403) {
          const data = await res.json();
          if (data.superseded) {
            // Session replaced elsewhere or stale, force logout
            console.warn('[Session] Superseded or stale, redirecting to login');
            window.location.href = '/login?error=session_expired';
          }
        }
      } catch (err) {
        // Silent fail on network error
      }
    };

    // Initial pulse
    pulse();

    // Pulse every 2 minutes
    const interval = setInterval(pulse, 120000);
    return () => clearInterval(interval);
  }, [pathname, router]);

  return null;
}
