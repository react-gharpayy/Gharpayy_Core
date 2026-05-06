import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ArenaKPIDefinition, ArenaSprintPlan, ArenaDailyState } from '@/models/ArenaState';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const roles = ['recruiter', 'coach', 'floor_lead', 'comm_shield'];
    
    // 1. Seed KPIs
    const kpiSeeds = [
      { role: 'recruiter', kpiName: 'leads_contacted', label: 'Leads Contacted', type: 'NUMBER', target: 50 },
      { role: 'recruiter', kpiName: 'interviews_scheduled', label: 'Interviews Scheduled', type: 'NUMBER', target: 12 },
      { role: 'recruiter', kpiName: 'eod_report', label: 'EOD Report Submitted', type: 'BOOLEAN', target: true },
      
      { role: 'coach', kpiName: 'team_reviews', label: 'Team Reviews Completed', type: 'NUMBER', target: 5 },
      { role: 'coach', kpiName: 'escalations_resolved', label: 'Escalations Resolved', type: 'BOOLEAN', target: true },
      
      { role: 'floor_lead', kpiName: 'tours_completed', label: 'Tours Completed', type: 'NUMBER', target: 10 },
      { role: 'floor_lead', kpiName: 'shift_briefing', label: 'Shift Briefing Done', type: 'BOOLEAN', target: true },
      
      { role: 'comm_shield', kpiName: 'tickets_resolved', label: 'Tickets Resolved', type: 'NUMBER', target: 30 },
      { role: 'comm_shield', kpiName: 'sla_maintained', label: 'SLA Maintained', type: 'BOOLEAN', target: true },
    ];

    for (const seed of kpiSeeds) {
      await ArenaKPIDefinition.findOneAndUpdate(
        { role: seed.role, kpiName: seed.kpiName },
        { $set: seed },
        { upsert: true }
      );
    }

    // 2. Seed Sprint Plans
    const sprintSeeds = [
      { role: 'recruiter', sprintName: 'Morning Sourcing Blitz', startTime: '10:00', endTime: '12:00', orderIndex: 0 },
      { role: 'recruiter', sprintName: 'Candidate Outreach', startTime: '14:00', endTime: '16:00', orderIndex: 1 },
      { role: 'coach', sprintName: 'Team Calibration', startTime: '11:00', endTime: '12:30', orderIndex: 0 },
    ];

    for (const seed of sprintSeeds) {
      await ArenaSprintPlan.findOneAndUpdate(
        { role: seed.role, sprintName: seed.sprintName },
        { $set: seed },
        { upsert: true }
      );
    }

    // 3. Seed Demo Operator State
    // Find an existing employee to use as a demo
    const demoEmp = await User.findOne({ role: 'employee' });
    if (demoEmp) {
      const today = new Date().toISOString().split('T')[0];
      const demoState = {
        userId: demoEmp._id,
        date: today,
        kpis: {
          'leads_contacted': { value: 32, isDone: false },
          'interviews_scheduled': { value: 5, isDone: false },
          'eod_report': { value: 0, isDone: false }
        },
        sprints: {
          0: { isDone: true, updatedAt: new Date() }
        },
        decisions: [
          { text: 'Prioritized hot leads over cold calling due to end-of-month target squeeze.', timestamp: new Date() }
        ],
        shieldMode: true
      };

      await ArenaDailyState.findOneAndUpdate(
        { userId: demoEmp._id, date: today },
        { $set: demoState },
        { upsert: true }
      );

      // Ensure the employee has a playbookRole
      if (!demoEmp.playbookRole) {
        demoEmp.playbookRole = 'recruiter';
        await demoEmp.save();
      }
    }

    return NextResponse.json({ ok: true, message: 'Demo data seeded successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
