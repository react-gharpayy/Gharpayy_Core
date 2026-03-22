import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Notice from '@/models/Notice';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

// GET — fetch notices for current user
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const isManager = user.role === 'admin' || user.role === 'manager';

    let notices;
    if (isManager) {
      // Managers see all notices they created + all general notices
      notices = await Notice.find({}).sort({ createdAt: -1 }).limit(50);
    } else {
      // Employees see notices targeting them or all employees
      notices = await Notice.find({
        $or: [
          { targetId: null },
          { targetId: user.id },
        ]
      }).sort({ createdAt: -1 }).limit(50);
    }

    // Add isRead flag per notice for this user
    const noticesWithRead = notices.map((n: any) => ({
      _id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      targetId: n.targetId,
      targetName: n.targetName,
      createdBy: n.createdBy,
      createdByName: n.createdByName || 'Admin',
      isRead: Array.isArray(n.readBy) ? n.readBy.includes(user.id) : false,
      createdAt: n.createdAt,
    }));

    const unreadCount = noticesWithRead.filter((n: any) => !n.isRead).length;

    return NextResponse.json({ notices: noticesWithRead, unreadCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create notice (manager/admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can create notices' }, { status: 403 });
    }

    const { title, message, type, targetId } = await req.json();
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message required' }, { status: 400 });
    }

    await connectDB();

    let targetName = null;
    if (targetId) {
      const target = await User.findById(targetId);
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — delete notice (manager/admin only)
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await connectDB();
    const deleted = await Notice.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
