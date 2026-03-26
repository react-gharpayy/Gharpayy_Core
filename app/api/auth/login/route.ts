import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';
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
    const rawPass = typeof body?.password === 'string' ? body.password : '';
    const normEmail = String(rawEmail).trim().toLowerCase();
    const normPass = String(rawPass).trim();
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPass = String(process.env.ADMIN_PASSWORD || '').trim();

    // Admin static check
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

    // Check if employee is approved
    if (user.role === 'employee' && !user.isApproved) {
      return NextResponse.json({ error: 'Your account is pending admin approval' }, { status: 403 });
    }

    const token = signToken({ id: user._id.toString(), email: user.email, fullName: user.fullName, role: user.role });
    const res = NextResponse.json({ ok: true, user: { id: user._id.toString(), email: user.email, fullName: user.fullName, role: user.role } });
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
