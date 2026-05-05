import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/lib/rate-limit';
import { BCRYPT_SALT_ROUNDS, PHOTO_MAX_SIZE_BYTES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { fullName, email, password, dateOfBirth, jobRole, profilePhoto, officeZoneId } = await req.json();

    // Validation
    if (!fullName?.trim()) return NextResponse.json({ error: 'Full name required' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    if (!dateOfBirth) return NextResponse.json({ error: 'Date of birth required' }, { status: 400 });
    if (!jobRole) return NextResponse.json({ error: 'Job role required' }, { status: 400 });
    if (!officeZoneId) return NextResponse.json({ error: 'Office zone required' }, { status: 400 });
    // Check photo size
    if (profilePhoto && typeof profilePhoto === 'string' && profilePhoto.length > PHOTO_MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Profile photo too large. Maximum 2MB.' }, { status: 400 });
    }

    await connectDB();

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user (not approved by default)
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      dateOfBirth,
      jobRole,
      profilePhoto, // base64 string
      officeZoneId,
      isApproved: false, // waiting for admin approval
      role: 'employee',
      workSchedule: {},
    });

    return NextResponse.json({
      ok: true,
      message: 'Signup successful! Please wait for admin approval.',
      userId: user._id.toString(),
    }, { status: 201 });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
