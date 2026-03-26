import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';

// GET - List pending/approved employees
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'pending' or 'approved' or 'all'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { role: 'employee' };
    if (status === 'pending') query.isApproved = false;
    if (status === 'approved') query.isApproved = true;

    const employees = await User.find(query)
      .populate('officeZoneId', 'name')
      .select('-password -profilePhoto')
      .sort({ createdAt: -1 });

    return NextResponse.json({ ok: true, count: employees.length, employees });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Approve or reject employee
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { employeeId, action } = await req.json();
    if (!employeeId || !action) {
      return NextResponse.json({ error: 'employeeId and action required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (action === 'approve') {
      employee.isApproved = true;
      await employee.save();
      return NextResponse.json({ ok: true, message: `Approved ${employee.fullName}` });
    } else {
      // reject = delete the user
      await User.findByIdAndDelete(employeeId);
      return NextResponse.json({ ok: true, message: `Rejected ${employee.fullName}` });
    }
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Edit employee details (admin only)
export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { employeeId, jobRole, officeZoneId } = await req.json();
    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });

    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Admin can only edit these fields
    if (jobRole) employee.jobRole = jobRole;
    if (officeZoneId) employee.officeZoneId = officeZoneId;

    await employee.save();
    return NextResponse.json({ ok: true, message: 'Employee updated', employee });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
