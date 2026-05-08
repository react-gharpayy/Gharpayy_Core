import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Build query — exclude current user and only show approved employees
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    
    let query: any = { isApproved: true };
    
    if (user.id !== 'admin' && mongoose.Types.ObjectId.isValid(user.id)) {
      query._id = { $ne: new mongoose.Types.ObjectId(user.id) };
    }

    if (search) {
      query.fullName = { $regex: search, $options: 'i' };
    }

    const employees = await User.find(
      query,
      'fullName email profilePhoto'
    )
    .limit(search ? 50 : 100)
    .lean();

    return NextResponse.json({ employees });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
