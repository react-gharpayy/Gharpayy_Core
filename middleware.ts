import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that do NOT require authentication
const PUBLIC = [
  '/login',
  '/signup',
  '/forgot-password',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/request-password-change',
  '/api/zones',
  '/api/test',
  // NOTE: /api/seed intentionally removed from PUBLIC (security fix)
];

/**
 * middleware.ts — Next.js Edge Middleware
 *
 * Replaces proxy.ts which was never executed by Next.js
 * because Next.js requires the file to be named `middleware.ts`
 * and export a function named `middleware`.
 *
 * Changes vs proxy.ts:
 *  1. File is now correctly named middleware.ts
 *  2. Export is now `export function middleware` (not `proxy`)
 *  3. /api/seed removed from PUBLIC routes (security fix)
 *  4. sub_admin role is handled server-side in each API route
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('gp_att_token')?.value;

  // API routes
  if (pathname.startsWith('/api/')) {
    const isPublic = PUBLIC.some((p) => pathname.startsWith(p));
    if (!isPublic && !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Page routes — redirect to /login if no token
  const isPublicPage = PUBLIC.some((p) => pathname.startsWith(p));
  if (!isPublicPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.png|.*\.svg|.*\.jpg).*)'],
};
