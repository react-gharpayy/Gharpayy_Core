import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { signToken, verifyToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { loginSchema } from '@/lib/validations';
import { ZodError } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.email === 'string' ? body.email : '';
    const rawPass  = typeof body?.password === 'string' ? body.password : '';
    const normEmail = String(rawEmail).trim().toLowerCase();
    const normPass  = String(rawPass).trim();

    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPass  = String(process.env.ADMIN_PASSWORD || '').trim();

    // Admin static check (unchanged)
    if (adminEmail && adminPass && normEmail === adminEmail && normPass === adminPass) {
      const token = signToken({ id: 'admin', email: normEmail, fullName: 'Admin', role: 'admin' });
      const res = NextResponse.json({ ok: true, user: { id: 'admin', email: normEmail, fullName: 'Admin', role: 'admin' } });
      res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
      return res;
    }

    // Non-admin: enforce schema
    const { email, password } = loginSchema.parse({ email: normEmail, password: normPass });
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    // Check if employee is approved (unchanged)
    if (user.role === 'employee' && !user.isApproved) {
      return NextResponse.json({ error: 'Your account is pending admin approval' }, { status: 403 });
    }

    // Check for existing active session
    if (user.activeSessionToken) {
      const incomingToken = req.cookies.get(COOKIE_NAME)?.value;
      if (incomingToken !== user.activeSessionToken) {
        const existingSession = verifyToken(user.activeSessionToken);
        if (existingSession) {
          // If the token is still valid (not expired), prevent login
          return NextResponse.json({ error: 'Already logged in at some other place.' }, { status: 403 });
        }
      }
    }

    const tokenPayload: Record<string, any> = {
      id:       user._id.toString(),
      email:    user.email,
      fullName: user.fullName,
      role:     user.role,
      playbookRole: user.playbookRole,
      // Include hierarchy fields in token for permission checks
      systemRole: user.systemRole ?? user.role,
      teamId:     user.teamId?.toString() ?? null,
      hierarchyRoleId: user.hierarchyRoleId?.toString() ?? null,
    };

    const token = signToken(tokenPayload);

    // Save the new token as the active session
    user.activeSessionToken = token;
    await user.save();

    const userResponse: Record<string, any> = {
      id:       user._id.toString(),
      email:    user.email,
      fullName: user.fullName,
      role:     user.role,
    };

    const res = NextResponse.json({ ok: true, user: userResponse });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;

  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
