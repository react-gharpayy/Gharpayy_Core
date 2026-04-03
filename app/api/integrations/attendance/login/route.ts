import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { loginSchema } from '@/lib/validations';
import { ZodError } from 'zod';

const INTEGRATION_JWT_SECRET = process.env.INTEGRATION_JWT_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    if (!INTEGRATION_JWT_SECRET) {
      return NextResponse.json({ error: 'INTEGRATION_JWT_SECRET is not set' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.email === 'string' ? body.email : '';
    const rawPass  = typeof body?.password === 'string' ? body.password : '';
    const normEmail = String(rawEmail).trim().toLowerCase();
    const normPass  = String(rawPass).trim();

    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPass  = String(process.env.ADMIN_PASSWORD || '').trim();

    if (adminEmail && adminPass && normEmail === adminEmail && normPass === adminPass) {
      const loginToken = jwt.sign(
        { scope: 'attendance_login', id: 'admin', email: normEmail, fullName: 'Admin', role: 'admin' },
        INTEGRATION_JWT_SECRET,
        { expiresIn: '5m' }
      );
      return NextResponse.json({ ok: true, loginToken });
    }

    const { email, password } = loginSchema.parse({ email: normEmail, password: normPass });
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    if (user.role === 'employee' && !user.isApproved) {
      return NextResponse.json({ error: 'Your account is pending admin approval' }, { status: 403 });
    }

    const payload: Record<string, any> = {
      scope: 'attendance_login',
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
    if (user.role === 'sub_admin' && user.assignedTeamId) {
      payload.assignedTeamId = user.assignedTeamId.toString();
    }

    const loginToken = jwt.sign(payload, INTEGRATION_JWT_SECRET, { expiresIn: '5m' });
    return NextResponse.json({ ok: true, loginToken });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
