import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import OfficeZone from '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';
import { BCRYPT_SALT_ROUNDS, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_LIMIT)), MAX_PAGE_LIMIT);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (user.role === 'manager') {
      query.managerId = user.id;
    }
    const [users, total] = await Promise.all([
      User.find(query, 'fullName email role createdAt teamName department jobRole').select('-profilePhoto').skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return NextResponse.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Admin/Manager only' }, { status: 403 });
    }
    const { fullName, email, password, role, officeZoneId, officeZoneName, teamName, department, jobRole, managerEmail, dateOfBirth } = await req.json();
    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'fullName, email, password required' }, { status: 400 });
    }
    await connectDB();
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    let resolvedZoneId = officeZoneId;
    if (!resolvedZoneId && officeZoneName) {
      const zone = await OfficeZone.findOne({ name: new RegExp(`^${officeZoneName}$`, 'i') }).lean() as any;
      if (zone?._id) resolvedZoneId = zone._id.toString();
    }
    let resolvedManagerId = undefined;
    if (managerEmail && user.role === 'admin') {
      const mgr = await User.findOne({ email: String(managerEmail).toLowerCase() }).select('_id role').lean() as any;
      if (mgr?._id && (mgr.role === 'manager' || mgr.role === 'admin')) {
        resolvedManagerId = mgr._id;
      }
    }

    const newUser = await User.create({
      fullName, email: email.toLowerCase(),
      password: hash,
      role: user.role === 'admin' ? (role || 'employee') : 'employee',
      managerId: user.role === 'manager' ? user.id : resolvedManagerId,
      officeZoneId: user.role === 'manager' ? resolvedZoneId || undefined : resolvedZoneId || undefined,
      dateOfBirth: dateOfBirth || '',
      teamName: teamName || '',
      department: department || '',
      jobRole: jobRole || undefined,
    });
    return NextResponse.json({ ok: true, user: { id: newUser._id, email: newUser.email, fullName: newUser.fullName, role: newUser.role } });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
