import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ArenaKPIDefinition, ArenaSprintPlan } from '@/models/ArenaState';
import User from '@/models/User';
import { NotificationService } from '@/modules/notifications/notification.service';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    await connectDB();
    
    const query = role ? { role } : {};
    const [kpis, sprints] = await Promise.all([
      ArenaKPIDefinition.find(query).sort({ role: 1, orderIndex: 1 }),
      ArenaSprintPlan.find(query).sort({ role: 1, orderIndex: 1 }),
    ]);

    return NextResponse.json({ ok: true, kpis, sprints });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, data } = body; // type: 'kpi' | 'sprint'

    await connectDB();

    if (type === 'kpi') {
      // Validate target based on type
      if (data.type === 'NUMBER' && typeof data.target !== 'number') {
        return NextResponse.json({ error: 'Target must be a number for NUMBER type' }, { status: 400 });
      }
      if (data.type === 'BOOLEAN' && typeof data.target !== 'boolean') {
        return NextResponse.json({ error: 'Target must be true/false for BOOLEAN type' }, { status: 400 });
      }

      const isNew = !data._id;

      // Auto-generate kpiName if missing or new
      if (isNew && !data.kpiName) {
        let baseKey = slugify(data.label);
        let finalKey = baseKey;
        let counter = 1;
        
        while (await ArenaKPIDefinition.findOne({ role: data.role, kpiName: finalKey })) {
          counter++;
          finalKey = `${baseKey}_${counter}`;
        }
        data.kpiName = finalKey;
      }

      const kpi = await ArenaKPIDefinition.findOneAndUpdate(
        { _id: data._id || new mongoose.Types.ObjectId() },
        { $set: data },
        { new: true, upsert: true }
      );

      if (isNew) {
        // Notify all employees with this playbookRole
        const users = await User.find({ playbookRole: data.role, role: 'employee' }).select('_id');
        for (const u of users) {
          await NotificationService.createNotification({
            userId: String(u._id),
            type: 'KPI_ASSIGNED',
            title: 'New KPI Assigned 🎯',
            message: `A new KPI "${data.label}" has been assigned to your role.`,
            link: '/arena',
            metadata: { kpiId: kpi._id, role: data.role }
          });
        }
      }

      return NextResponse.json({ ok: true, kpi });
    } else if (type === 'sprint') {
      const isNew = !data._id;
      const sprint = await ArenaSprintPlan.findOneAndUpdate(
        { _id: data._id || new mongoose.Types.ObjectId() },
        { $set: data },
        { new: true, upsert: true }
      );

      if (isNew) {
        // Notify all employees with this playbookRole
        const users = await User.find({ playbookRole: data.role, role: 'employee' }).select('_id');
        for (const u of users) {
          await NotificationService.createNotification({
            userId: String(u._id),
            type: 'SPRINT_ASSIGNED',
            title: 'New Sprint Plan Updated ⚡',
            message: `A new sprint "${data.sprintName}" has been added to your schedule.`,
            link: '/arena',
            metadata: { sprintId: sprint._id, role: data.role }
          });
        }
      }

      return NextResponse.json({ ok: true, sprint });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    await connectDB();

    if (type === 'kpi') {
      await ArenaKPIDefinition.findByIdAndDelete(id);
    } else if (type === 'sprint') {
      await ArenaSprintPlan.findByIdAndDelete(id);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


