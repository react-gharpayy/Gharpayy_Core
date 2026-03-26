import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { adminResetPasswordSchema } from '@/lib/validations';
import User from '@/models/User';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { userId, newPassword } = adminResetPasswordSchema.parse(body);
    if (!mongoose.Types.ObjectId.isValid(userId)) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

    const hash = await bcrypt.hash(newPassword, 12);
    await connectDB();
    await User.findByIdAndUpdate(userId, { password: hash });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

