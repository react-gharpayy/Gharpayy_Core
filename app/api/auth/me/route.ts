import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import '@/models/OfficeZone'; // ← required so mongoose knows the schema for populate
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';

// GET — return current user with full DB data
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Static admin — no DB record exists
    if (user.id === 'admin') {
      return NextResponse.json({
        id: 'admin',
        fullName: user.fullName || 'Admin',
        email: user.email,
        role: 'admin',
        isApproved: true,
        jobRole: 'Administrator',
        createdAt: new Date().toISOString(),
      });
    }

    // Validate ObjectId before querying MongoDB
    if (!mongoose.Types.ObjectId.isValid(user.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();

    const dbUser = await User.findById(user.id)
      .populate('officeZoneId', 'name')
      .select('-password')
      .lean() as any;

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ ...dbUser, id: dbUser._id?.toString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — update profile photo
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.id === 'admin') {
      return NextResponse.json({ error: 'Cannot update admin photo' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(user.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { profilePhoto } = await req.json();
    if (!profilePhoto) return NextResponse.json({ error: 'profilePhoto is required' }, { status: 400 });

    if (!profilePhoto.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    await connectDB();

    await User.findByIdAndUpdate(user.id, { profilePhoto });

    return NextResponse.json({ ok: true, message: 'Photo updated successfully' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}