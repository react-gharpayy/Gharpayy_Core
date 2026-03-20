import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    await connectDB();

    // Admin static check
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = signToken({ id: 'admin', email, fullName: 'Admin', role: 'admin' });
      const res = NextResponse.json({ ok: true, user: { id: 'admin', email, fullName: 'Admin', role: 'admin' } });
      res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
      return res;
    }

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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
