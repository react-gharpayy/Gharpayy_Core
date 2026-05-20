import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC = [
  '/login',
  '/signup',
  '/forgot-password',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/request-password-change',
  '/api/integrations/attendance/login',
  '/api/integrations/attendance/exchange',
  '/api/integrations/attendance/summary',
  '/api/integrations/crm/daily',
  '/api/zones',
  '/api/test',
  // NOTE: /api/seed intentionally removed from public routes (security fix)
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('gp_att_token')?.value;

  if (pathname.startsWith('/api/')) {
    const isPublic = PUBLIC.some((p) => pathname.startsWith(p));
    if (!isPublic && !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicPage = PUBLIC.some((p) => pathname.startsWith(p));
  if (!isPublicPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg).*)'],
};
