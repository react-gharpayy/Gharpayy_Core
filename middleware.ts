import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


const PUBLIC = ['/login', '/signup', '/api/auth/login', '/api/auth/signup', '/api/zones', '/api/test', '/api/seed'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.some(p => pathname.startsWith(p));
  const token = request.cookies.get('gp_att_token')?.value;

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg).*)'],
};
