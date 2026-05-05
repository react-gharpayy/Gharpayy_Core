import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import OfficeZone from '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';
import { orgUpdateSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEmployee(e: any) {
  return {
    _id:        e._id.toString(),
    fullName:   e.fullName,
    email:      e.email,
    role:       e.role,
    teamName:   e.teamName   || '',
    department: e.department || '',
    team:       (e.officeZoneId as Record<string, unknown>)?.name || 'No Zone',
    jobRole:    e.jobRole    || '',
    isApproved: e.isApproved,
    managerId:  e.managerId?.toString?.() || null,
  };
}

// GET /api/org
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const baseQuery = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = await User.find(baseQuery, '-password')
      .select('-profilePhoto')
      .populate('officeZoneId', 'name')
      .populate('managerId', 'fullName email role')
      .lean() as any[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zones = await OfficeZone.find({}).lean() as any[];

    const dbManagers = users.filter(u => u.role === 'admin' || u.role === 'manager');
    const employees  = users.filter(u => u.role === 'employee');

    // Check if any employees have managerId assigned
    const hasManagerAssignments = employees.some(e => (e.managerId && (e.managerId as any)._id) || e.managerId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tree: any[] = [];

    if (hasManagerAssignments && dbManagers.length > 0) {
      // Group by manager
      tree = dbManagers.map(mgr => ({
        _id:      mgr._id.toString(),
        fullName: mgr.fullName,
        email:    mgr.email,
        role:     mgr.role,
        team:     (mgr.officeZoneId as Record<string, unknown>)?.name || 'No Zone',
        groupType: 'manager',
        reports:  employees
          .filter(e => {
            const mgrId = (e.managerId as any)?._id?.toString?.() || e.managerId?.toString?.() || null;
            return mgrId === mgr._id.toString();
          })
          .map(e => mapEmployee(e)),
      }));
    } else {
      // Group by office zone instead
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tree = zones.map((z: any) => ({
        _id:      z._id.toString(),
        fullName: z.name,
        email:    '',
        role:     'zone',
        team:     z.name,
        groupType: 'zone',
        reports:  employees
          .filter(e => e.officeZoneId?._id?.toString() === z._id.toString() ||
                       // eslint-disable-next-line @typescript-eslint/no-explicit-any
                       (e.officeZoneId as any)?._id?.toString() === z._id.toString())
          .map(e => mapEmployee(e)),
      })).filter(z => z.reports.length > 0);
    }

    // Unassigned = employees with no managerId AND no officeZoneId
    const unassigned = hasManagerAssignments
      ? employees.filter(e => {
        const mgrId = (e.managerId as any)?._id?.toString?.() || e.managerId?.toString?.() || null;
        return !mgrId;
      }).map(e => mapEmployee(e))
      : []; // when grouping by zone, all should be in a zone

    // Available managers for dropdown (DB managers + static admin)
    const availableManagers = [
      ...dbManagers.map(m => ({
        _id:      m._id.toString(),
        fullName: m.fullName,
        email:    m.email,
        role:     m.role,
      })),
    ];

    return NextResponse.json({
      ok: true,
      tree,
      unassigned,
      total: users.length,
      groupedByZone: !hasManagerAssignments,
      availableManagers,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/org - assign manager/team/department
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 401 });
    }

    const body = await req.json();
    let parsed;
    try {
      parsed = orgUpdateSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      }
      throw e;
    }

    const { employeeId, managerId, teamName, department } = parsed;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = {};
    if (managerId  !== undefined) update.managerId  = managerId || null;
    if (teamName   !== undefined) update.teamName   = teamName;
    if (department !== undefined) update.department = department;

    const updated = await User.findByIdAndUpdate(
      employeeId, update, { new: true }
    ).select('-password');

    if (!updated) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    return NextResponse.json({ ok: true, employee: updated });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
