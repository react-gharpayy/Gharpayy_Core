import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { passwordChangeSchema } from '@/lib/validations';
import { z, ZodError } from 'zod';
import PasswordChangeRequest from '@/models/PasswordChangeRequest';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const user = await getAuthUser();
    const body = await req.json().catch(() => ({}));
    const parsed = passwordChangeSchema.parse(body);
    const hash = await bcrypt.hash(parsed.newPassword, 12);

    await connectDB();

    let targetUserId: string | null = null;

    if (user && user.id !== 'admin' && mongoose.Types.ObjectId.isValid(user.id)) {
      targetUserId = user.id;
    } else if (body?.email) {
      const email = z.string().email().parse(body.email);
      const u = await User.findOne({ email: email.toLowerCase(), role: 'employee' }).select('_id').lean() as any;
      targetUserId = u?._id?.toString() || null;
    }

    if (!targetUserId) {
      // Do not leak user existence
      return NextResponse.json({ ok: true, message: 'Password change request submitted for approval' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const pending = await PasswordChangeRequest.findOne({
      userId: targetUserId,
      status: 'pending',
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).select('_id').lean();

    if (pending) {
      return NextResponse.json({ error: 'A pending request already exists' }, { status: 400 });
    }

    await PasswordChangeRequest.create({
      userId: targetUserId,
      newPasswordHash: hash,
      status: 'pending',
      expiresAt,
    });

    return NextResponse.json({ ok: true, message: 'Password change request submitted for approval' });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
