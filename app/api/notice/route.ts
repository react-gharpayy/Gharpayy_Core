import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Notice from '@/models/Notice';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { NOTICE_LIMIT } from '@/lib/constants';
import { noticeSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// GET - fetch notices for current user
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const isManager = user.role === 'admin' || user.role === 'manager';

    let notices;
    if (isManager) {
      if (user.role === 'manager') {
        const teamEmployees = await User.find({ managerId: user.id, role: 'employee' }, '_id').lean() as { _id: { toString: () => string } }[];
        const teamIds = teamEmployees.map(e => e._id.toString());
        notices = await Notice.find({
          $or: [
            { targetId: null },
            { targetId: { $in: teamIds } },
            { createdBy: user.id },
          ],
        }).sort({ createdAt: -1 }).limit(NOTICE_LIMIT);
      } else {
        notices = await Notice.find({}).sort({ createdAt: -1 }).limit(NOTICE_LIMIT);
      }
    } else {
      // Employees see notices targeting them or all employees
      notices = await Notice.find({
        $or: [
          { targetId: null },
          { targetId: user.id },
        ]
      }).sort({ createdAt: -1 }).limit(NOTICE_LIMIT);
    }

    // Add isRead flag per notice for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noticesWithRead = notices.map((n: any) => ({
      _id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      targetId: n.targetId,
      targetName: n.targetName,
      createdBy: n.createdBy,
      createdByName: n.createdByName || 'Admin',
      readBy: Array.isArray(n.readBy) ? n.readBy : [],
      isRead: Array.isArray(n.readBy) ? n.readBy.includes(user.id) : false,
      createdAt: n.createdAt,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unreadCount = noticesWithRead.filter((n: any) => !n.isRead).length;

    return NextResponse.json({ notices: noticesWithRead, unreadCount });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - create notice (manager/admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can create notices' }, { status: 403 });
    }

    const body = await req.json();
    let parsed;
    try {
      parsed = noticeSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      }
      throw e;
    }

    const { title, message, type, targetId } = parsed;

    await connectDB();

    let targetName = null;
    if (targetId) {
      const target = await User.findById(targetId);
      if (user.role === 'manager' && target?.managerId?.toString() !== user.id) {
        return NextResponse.json({ error: 'Cannot create notice outside your team' }, { status: 403 });
      }
      targetName = target?.fullName || null;
    }

    const notice = await Notice.create({
      title,
      message,
      type: type || 'general',
      targetId: targetId || null,
      targetName,
      createdBy: user.id,
      createdByName: user.fullName || 'Manager',
      readBy: [],
    });

    return NextResponse.json({ ok: true, notice });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - delete notice (manager/admin only)
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await connectDB();
    const notice = await Notice.findById(id);
    if (!notice) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    if (user.role === 'manager' && notice.createdBy !== user.id) {
      return NextResponse.json({ error: 'Cannot delete notice outside your team' }, { status: 403 });
    }
    const deleted = await Notice.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
