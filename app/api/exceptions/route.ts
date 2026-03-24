import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ExceptionRequest from '@/models/ExceptionRequest';
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    await connectDB();
    const query: any = {};
    if (user.role === 'employee' && mongoose.Types.ObjectId.isValid(user.id)) query.employeeId = new mongoose.Types.ObjectId(user.id);
    if (status !== 'all') query.status = status;
    const exceptions = await ExceptionRequest.find(query).sort({ createdAt: -1 }).lean();
    const mapped = exceptions.map((e: any) => ({ ...e, _id: e._id.toString(), employeeId: e.employeeId.toString() }));
    return NextResponse.json({ ok: true, exceptions: mapped, pendingCount: mapped.filter(e => e.status === 'pending').length });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.id === 'admin') return NextResponse.json({ error: 'Use employee account' }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(user.id)) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
    const { type, date, reason, requestedTime } = await req.json();
    if (!type || !date || !reason) return NextResponse.json({ error: 'type, date, reason required' }, { status: 400 });
    await connectDB();
    const exc = await ExceptionRequest.create({
      employeeId: new mongoose.Types.ObjectId(user.id),
      employeeName: user.fullName || user.email,
      type, date, reason, requestedTime: requestedTime || null, status: 'pending',
    });
    return NextResponse.json({ ok: true, exception: exc });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role === 'employee') return NextResponse.json({ error: 'Admin/Manager only' }, { status: 403 });
    const { exceptionId, status, reviewNote } = await req.json();
    if (!exceptionId || !['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'exceptionId and valid status required' }, { status: 400 });
    await connectDB();
    const exc = await ExceptionRequest.findByIdAndUpdate(exceptionId, {
      status, reviewedBy: user.id, reviewedByName: user.fullName || 'Admin',
      reviewNote: reviewNote || '', reviewedAt: new Date(),
    }, { new: true });
    if (!exc) return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
    return NextResponse.json({ ok: true, exception: exc });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}