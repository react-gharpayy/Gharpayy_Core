import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';

const INTEGRATION_JWT_SECRET = process.env.INTEGRATION_JWT_SECRET || '';

export async function GET(req: NextRequest) {
  try {
    if (!INTEGRATION_JWT_SECRET) {
      return NextResponse.json({ error: 'INTEGRATION_JWT_SECRET is not set' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || '';
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const decoded = jwt.verify(token, INTEGRATION_JWT_SECRET) as any;
    if (!decoded || decoded.scope !== 'attendance_login') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const authToken = signToken({
      id: decoded.id,
      email: decoded.email,
      fullName: decoded.fullName,
      role: decoded.role,
      assignedTeamId: decoded.assignedTeamId,
    });

    const redirectTo = '/home';
    const res = NextResponse.redirect(new URL(redirectTo, req.url));
    res.cookies.set(COOKIE_NAME, authToken, COOKIE_OPTIONS);
    return res;
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
