import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import HierarchyRole from '@/models/HierarchyRole';
import Team from '@/models/Team';
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
      const adminCapabilities = {
        canViewKPIs: true, canEditKPIs: true, canCreateKPIs: true,
        canViewAttendance: true, canEditAttendance: true,
        canConduct1on1s: true, canManageReports: true,
        canApproveRequests: true, canViewTeamDashboards: true,
      };
      const token = signToken({ id: 'admin', email: normEmail, fullName: 'Admin', role: 'admin', systemRole: 'admin', capabilities: adminCapabilities });
      const res = NextResponse.json({ ok: true, user: { id: 'admin', email: normEmail, fullName: 'Admin', role: 'admin' } });
      res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
      return res;
    }

    // Non-admin: enforce schema
    let validatedData;
    try {
      validatedData = loginSchema.parse({ email: normEmail, password: normPass });
    } catch (parseError) {
      if (parseError instanceof ZodError) {
        return NextResponse.json({ error: 'Invalid email or password format.' }, { status: 400 });
      }
      throw parseError;
    }
    const { email, password } = validatedData;

    try {
      await connectDB();
    } catch (dbError) {
      console.error('[Login Hardening] Database connection failed:', dbError);
      return NextResponse.json({ error: 'Database connection failed. Please try again.' }, { status: 500 });
    }

    // Explicitly reference models to ensure registration
    const _ref1 = HierarchyRole;
    const _ref2 = Team;

    let user;
    try {
      user = await User.findOne({ email: email.toLowerCase() }).populate('hierarchyRoleId');
    } catch (findError) {
      console.error('[Login Hardening] User lookup failed:', findError);
      return NextResponse.json({ error: 'User lookup failed.' }, { status: 500 });
    }

    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      console.error('[Login Hardening] Password decryption failed:', bcryptError);
      return NextResponse.json({ error: 'Password verification failed.' }, { status: 500 });
    }
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    // Check if employee is approved (unchanged)
    if (user.role === 'employee' && !user.isApproved) {
      return NextResponse.json({ error: 'Your account is pending admin approval' }, { status: 403 });
    }

    // Extract capabilities from hierarchy role (supports both old 'permissions' and new 'capabilities' field)
    const hierarchyRole = user.hierarchyRoleId as any;
    const userCapabilities = hierarchyRole?.capabilities ?? hierarchyRole?.permissions ?? null;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Login] User: ${user.email}, HierarchyRole: ${hierarchyRole?.name ?? 'none'}, Capabilities:`, userCapabilities);
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
      hierarchyRoleId: hierarchyRole?._id?.toString() ?? user.hierarchyRoleId?.toString() ?? null,
      capabilities: userCapabilities,
    };

    let token;
    try {
      token = signToken(tokenPayload);
    } catch (tokenError) {
      console.error('[Login Hardening] JWT token generation failed:', tokenError);
      return NextResponse.json({ error: 'Failed to generate session token.' }, { status: 500 });
    }

    try {
      // Save the new token as the active session (informational only)
      user.activeSessionToken = token;
      user.activeSessionAt = new Date();
      user.lastSeenAt = new Date();
      await user.save();
    } catch (saveError) {
      // Hardening: Do NOT block login if metadata database save fails.
      // Favor operational continuity over aggressive tracking.
      console.warn('[Login Hardening] Failed to update user active session metadata:', saveError);
    }

    const userResponse: Record<string, any> = {
      id:       user._id.toString(),
      email:    user.email,
      fullName: user.fullName,
      role:     user.role,
    };

    const res = NextResponse.json({ ok: true, user: userResponse });
    try {
      res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    } catch (cookieError) {
      console.error('[Login Hardening] Setting auth cookie failed:', cookieError);
      return NextResponse.json({ error: 'Failed to establish session cookies.' }, { status: 500 });
    }
    return res;

  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
