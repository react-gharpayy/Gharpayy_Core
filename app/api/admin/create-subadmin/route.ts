import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import OfficeZone from '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';
import { createSubAdminSchema, updateSubAdminSchema } from '@/lib/validations';
import { ZodError } from 'zod';

/**
 * POST /api/admin/create-subadmin
 * Create a new sub_admin user and assign them to a team (OfficeZone).
 * ADMIN only.
 *
 * Body: { fullName, email, password, teamId }
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await getAuthUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let parsed;
    try {
      parsed = createSubAdminSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
      }
      throw e;
    }

    const { fullName, email, password, teamId } = parsed;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return NextResponse.json({ error: 'Invalid teamId - must be a valid OfficeZone ObjectId' }, { status: 400 });
    }

    await connectDB();

    // Verify the zone exists
    const zone = await OfficeZone.findById(teamId).lean();
    if (!zone) {
      return NextResponse.json({ error: 'OfficeZone not found for the given teamId' }, { status: 404 });
    }

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const subAdmin = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'sub_admin',
      assignedTeamId: new mongoose.Types.ObjectId(teamId),
      isApproved: true, // sub_admins are pre-approved by the admin
    });

    return NextResponse.json({
      ok: true,
      message: 'Sub-admin created successfully',
      subAdmin: {
        id: subAdmin._id.toString(),
        fullName: subAdmin.fullName,
        email: subAdmin.email,
        role: subAdmin.role,
        assignedTeamId: teamId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assignedTeamName: (zone as any).name || '',
      },
    });
  } catch (e: unknown) {
    console.error('API error [create-subadmin POST]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/create-subadmin
 * Reassign a sub_admin to a different team, OR update their role back to employee.
 * ADMIN only.
 *
 * Body: { subAdminId, teamId }
 */
export async function PATCH(req: NextRequest) {
  try {
    const caller = await getAuthUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let parsed;
    try {
      parsed = updateSubAdminSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
      }
      throw e;
    }

    const { subAdminId, teamId } = parsed;

    if (!mongoose.Types.ObjectId.isValid(subAdminId)) {
      return NextResponse.json({ error: 'Invalid subAdminId' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 });
    }

    await connectDB();

    const zone = await OfficeZone.findById(teamId).lean();
    if (!zone) {
      return NextResponse.json({ error: 'OfficeZone not found' }, { status: 404 });
    }

    const subAdmin = await User.findById(subAdminId);
    if (!subAdmin) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (subAdmin.role !== 'sub_admin') {
      return NextResponse.json({ error: 'User is not a sub_admin' }, { status: 400 });
    }

    subAdmin.assignedTeamId = new mongoose.Types.ObjectId(teamId);
    subAdmin.updatedAt = new Date();
    await subAdmin.save();

    return NextResponse.json({
      ok: true,
      message: 'Sub-admin team reassigned successfully',
      subAdmin: {
        id: subAdmin._id.toString(),
        fullName: subAdmin.fullName,
        email: subAdmin.email,
        assignedTeamId: teamId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assignedTeamName: (zone as any).name || '',
      },
    });
  } catch (e: unknown) {
    console.error('API error [create-subadmin PATCH]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/create-subadmin
 * List all sub_admin users. ADMIN only.
 */
export async function GET() {
  try {
    const caller = await getAuthUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    await connectDB();

    const subAdmins = await User.find({ role: 'sub_admin' })
      .populate('assignedTeamId', 'name')
      .select('fullName email role assignedTeamId isApproved createdAt')
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = subAdmins.map((u: any) => ({
      id: u._id.toString(),
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isApproved: u.isApproved,
      assignedTeamId: u.assignedTeamId?._id?.toString() || null,
      assignedTeamName: u.assignedTeamId?.name || 'Unassigned',
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ ok: true, subAdmins: mapped, total: mapped.length });
  } catch (e: unknown) {
    console.error('API error [create-subadmin GET]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
