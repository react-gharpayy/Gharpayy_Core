import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ExceptionRequest from '@/models/ExceptionRequest';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';
import { exceptionSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { isAdmin, isElevated, isSubAdmin } from '@/lib/role-guards';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (user.role === 'employee' && mongoose.Types.ObjectId.isValid(user.id)) {
      // Employee: only their own exceptions (unchanged)
      query.employeeId = new mongoose.Types.ObjectId(user.id);
    } else if (user.role === 'manager') {
      const teamEmployees = await User.find(
        { managerId: user.id, role: 'employee', isApproved: true },
        '_id'
      ).lean();
      const teamIds = teamEmployees.map(e => e._id);
      query.employeeId = { $in: teamIds };
    } else if (isSubAdmin(user) && user.assignedTeamId) {
      // sub_admin: only exceptions from their team's employees
      const teamEmployees = await User.find(
        { officeZoneId: user.assignedTeamId, role: 'employee', isApproved: true },
        '_id'
      ).lean();
      const teamIds = teamEmployees.map(e => e._id);
      query.employeeId = { $in: teamIds };
    }
    // admin / manager: no filter - sees all (unchanged)

    if (status !== 'all') query.status = status;

    const exceptions = await ExceptionRequest.find(query).sort({ createdAt: -1 }).lean();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = exceptions.map((e: any) => ({
      ...e,
      _id: e._id.toString(),
      employeeId: e.employeeId.toString(),
    }));
    return NextResponse.json({ ok: true, exceptions: mapped, pendingCount: mapped.filter(e => e.status === 'pending').length });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.id === 'admin') return NextResponse.json({ error: 'Use employee account' }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(user.id)) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

    const body = await req.json();
    let parsed;
    try {
      parsed = exceptionSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      throw e;
    }

    const { type, date, reason, requestedTime } = parsed;
    await connectDB();
    const exc = await ExceptionRequest.create({
      employeeId:    new mongoose.Types.ObjectId(user.id),
      employeeName:  user.fullName || user.email,
      type, date, reason,
      requestedTime: requestedTime || null,
      status: 'pending',
    });
    return NextResponse.json({ ok: true, exception: exc });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role === 'employee') {
      return NextResponse.json({ error: 'Admin/Manager/SubAdmin only' }, { status: 403 });
    }

    const { exceptionId, status, reviewNote } = await req.json();
    if (!exceptionId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'exceptionId and valid status required' }, { status: 400 });
    }

    await connectDB();

    // manager: verify exception belongs to their team
    if (user.role === 'manager') {
      const exc = await ExceptionRequest.findById(exceptionId).lean();
      if (!exc) return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
      const emp = await User.findById((exc as any).employeeId).lean();
      if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      const mgr = (emp as any).managerId?.toString();
      if (mgr !== user.id) {
        return NextResponse.json({ error: 'Cannot approve exception outside your team' }, { status: 403 });
      }
    }

    // sub_admin: verify the exception belongs to one of their team's employees
    if (isSubAdmin(user) && user.role !== 'manager' && user.assignedTeamId) {
      const exc = await ExceptionRequest.findById(exceptionId).lean();
      if (!exc) return NextResponse.json({ error: 'Exception not found' }, { status: 404 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emp = await User.findById((exc as any).employeeId).lean();
      if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const empZone = (emp as any).officeZoneId?.toString();
      if (empZone !== user.assignedTeamId) {
        return NextResponse.json({ error: 'Cannot approve exception outside your team' }, { status: 403 });
      }
    }

    const exc = await ExceptionRequest.findByIdAndUpdate(
      exceptionId,
      {
        status,
        reviewedBy:   user.id,
        reviewedByName: user.fullName || 'Admin',
        reviewNote:   reviewNote || '',
        reviewedAt:   new Date(),
      },
      { new: true }
    );
    if (!exc) return NextResponse.json({ error: 'Exception not found' }, { status: 404 });

    return NextResponse.json({ ok: true, exception: exc });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
