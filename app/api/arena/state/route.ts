import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ArenaDailyState, ArenaKPIDefinition, ArenaSprintPlan, ArenaCommWindow } from '@/models/ArenaState';
import { PlaybookRole } from '@/models/PlaybookRole';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || authUser.id;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // SECURITY: If querying for another user, must be admin/manager/hr
    if (userId !== authUser.id && !['admin', 'manager', 'hr'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    
    // Fetch user for playbookRole
    const user = await User.findById(userId).select('fullName email playbookRole workSchedule');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let state = await ArenaDailyState.findOne({ userId, date });
    if (!state) {
      state = await ArenaDailyState.create({ 
        userId, date, kpis: {}, sprints: {}, decisions: [], reportData: {}, shieldMode: false 
      });
    }

    const userRole = user.playbookRole || 'recruiter';
    const [kpis, sprints, comms, roleData] = await Promise.all([
      ArenaKPIDefinition.find({ role: userRole }).sort({ orderIndex: 1 }),
      ArenaSprintPlan.find({ role: userRole }).sort({ orderIndex: 1 }),
      ArenaCommWindow.find({ role: userRole }).sort({ orderIndex: 1 }),
      PlaybookRole.findOne({ slug: userRole })
    ]);

    return NextResponse.json({ 
      ok: true, 
      state, 
      user, 
      roleData,
      definitions: { kpis, sprints, comms } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { userId, date, kpis, sprints, comms, decision, eodReport, shieldMode } = body;

    // MANDATORY BACKEND SECURITY: Only owner can mutate their own state
    // Admins/Managers can ONLY MONITOR.
    if (userId !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden: Admins can only monitor, not interact.' }, { status: 403 });
    }

    await connectDB();

    const update: any = {};
    if (kpis) {
      // Update specific KPIs
      for (const [key, val] of Object.entries(kpis)) {
        update[`kpis.${key}`] = { ...val as any, updatedAt: new Date() };
      }
    }
    if (sprints) {
      // Update specific Sprints
      for (const [key, val] of Object.entries(sprints)) {
        update[`sprints.${key}`] = { ...val as any, updatedAt: new Date() };
      }
    }
    if (comms) {
      // Update specific Comms
      for (const [key, val] of Object.entries(comms)) {
        update[`comms.${key}`] = { ...val as any, updatedAt: new Date() };
      }
    }
    if (eodReport) update.eodReport = { ...eodReport, submittedAt: new Date() };
    if (shieldMode !== undefined) update.shieldMode = shieldMode;

    let state: any = await ArenaDailyState.findOneAndUpdate(
      { userId, date },
      { $set: update },
      { new: true, upsert: true }
    );

    if (decision) {
      state = await ArenaDailyState.findOneAndUpdate(
        { userId, date },
        { $push: { decisions: { text: decision, timestamp: new Date() } } },
        { new: true }
      );
    }

    return NextResponse.json({ ok: true, state });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
