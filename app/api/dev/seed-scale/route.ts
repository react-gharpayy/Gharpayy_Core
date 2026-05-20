import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Task from '@/models/Task';
import Tracker from '@/models/Tracker';
import CoachingSession from '@/models/CoachingSession';
import mongoose_models from 'mongoose'; // Just to ensure models are loaded

export const maxDuration = 300; // Allow 5 minutes in Vercel just in case
export const dynamic = 'force-dynamic';

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'DEV ONLY: Cannot run in production' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { 
      confirm, 
      numUsers = 200, 
      daysHistory = 30,
      tasksPerUser = 20,
      wipeOld = false
    } = body;

    if (confirm !== 'I_AM_SURE') {
      return NextResponse.json({ error: 'Missing explicit confirmation' }, { status: 400 });
    }

    await connectDB();
    const startMs = Date.now();
    const seededBatchId = `batch_${Date.now()}`;

    // Optional Cleanup
    if (wipeOld) {
      const delFilter = { isSynthetic: true };
      await Promise.all([
        User.collection.deleteMany(delFilter),
        Attendance.collection.deleteMany(delFilter),
        Task.collection.deleteMany(delFilter),
        Tracker.collection.deleteMany(delFilter),
        CoachingSession.collection.deleteMany(delFilter),
        mongoose.connection.collection('kudos').deleteMany(delFilter).catch(() => {}),
        mongoose.connection.collection('gpofficezones').deleteMany(delFilter).catch(() => {})
      ]);
    }

    // 1. Create Zones
    const zonesToCreate = [
      { name: 'North HQ (Synthetic)', location: 'New Delhi', status: 'active', isSynthetic: true, seededBatchId },
      { name: 'South Hub (Synthetic)', location: 'Bangalore', status: 'active', isSynthetic: true, seededBatchId },
      { name: 'West Branch (Synthetic)', location: 'Mumbai', status: 'active', isSynthetic: true, seededBatchId },
    ];
    const { insertedIds: zoneIdsObj } = await mongoose.connection.collection('gpofficezones').insertMany(zonesToCreate);
    const zoneIds = Object.values(zoneIdsObj);

    // 2. Create Users
    const users = [];
    const profiles = ['HighPerformer', 'OnTrack', 'Burnout', 'Disengaged'];
    const roles = ['employee', 'manager', 'team_lead', 'hr'];

    let adminId = new mongoose.Types.ObjectId();
    
    // Create an Admin manager
    users.push({
      _id: adminId,
      fullName: 'Synthetic Admin',
      email: `admin_${seededBatchId}@synthetic.com`,
      role: 'admin',
      isApproved: true,
      officeZoneId: zoneIds[0],
      isSynthetic: true,
      seededBatchId
    });

    const managers = [adminId];

    for (let i = 0; i < numUsers; i++) {
      const profile = randomChoice(profiles);
      const role = i < numUsers * 0.1 ? 'manager' : 'employee';
      const _id = new mongoose.Types.ObjectId();
      if (role === 'manager') managers.push(_id);

      users.push({
        _id,
        fullName: `SynthUser ${i}`,
        email: `user${i}_${seededBatchId}@synthetic.com`,
        role,
        managerId: randomChoice(managers),
        officeZoneId: randomChoice(zoneIds),
        isApproved: true,
        playbookRole: 'Developer',
        profileType: profile, // Custom tracking
        isSynthetic: true,
        seededBatchId
      });
    }

    await User.collection.insertMany(users);

    // 3. Generate Attendance, Tasks, Trackers
    const attendances = [];
    const tasks = [];
    const trackers = [];
    const coachingSessions = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const u of users) {
      if (u.role === 'admin') continue;

      let p_present = 0.9, p_late = 0.1, p_task_done = 0.8, p_tracker = 0.9;
      if (u.profileType === 'HighPerformer') { p_present = 0.98; p_late = 0.02; p_task_done = 0.95; p_tracker = 0.99; }
      else if (u.profileType === 'Burnout') { p_present = 0.95; p_late = 0.2; p_task_done = 0.6; p_tracker = 0.7; }
      else if (u.profileType === 'Disengaged') { p_present = 0.7; p_late = 0.4; p_task_done = 0.4; p_tracker = 0.4; }

      // Attendance & Trackers
      for (let d = 0; d < daysHistory; d++) {
        const dateObj = new Date(today.getTime() - d * 86400000);
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends roughly

        const dateStr = dateObj.toISOString().split('T')[0];
        
        // Attendance
        if (Math.random() < p_present) {
          const isLate = Math.random() < p_late;
          const checkInHour = isLate ? randomInt(10, 11) : randomInt(8, 9);
          attendances.push({
            employeeId: u._id,
            date: dateStr,
            dayStatus: isLate ? 'Late' : 'On Time',
            workMode: randomChoice(['Present', 'WFH']),
            isCheckedIn: true,
            totalWorkMins: randomInt(400, 540),
            totalBreakMins: randomInt(30, 90),
            isSynthetic: true,
            seededBatchId
          });
        } else {
          attendances.push({
            employeeId: u._id,
            date: dateStr,
            dayStatus: 'Absent',
            workMode: 'Absent',
            isSynthetic: true,
            seededBatchId
          });
        }

        // Trackers
        if (Math.random() < p_tracker) {
          trackers.push({
            employeeId: u._id,
            date: dateStr,
            isSubmitted: true,
            isSynthetic: true,
            seededBatchId
          });
        }
      }

      // Tasks
      for (let t = 0; t < tasksPerUser; t++) {
        const isDone = Math.random() < p_task_done;
        tasks.push({
          title: `Synthetic Task ${t} for ${u.fullName}`,
          description: 'Auto-generated load testing task',
          assignedTo: u._id,
          assignedBy: u.managerId,
          status: isDone ? 'completed' : randomChoice(['pending', 'in-progress', 'overdue', 'blocked']),
          priority: randomChoice(['low', 'medium', 'high']),
          createdAt: new Date(today.getTime() - randomInt(0, daysHistory) * 86400000),
          isSynthetic: true,
          seededBatchId
        });
      }

      // Coaching (Interventions for burnout/disengaged)
      if (u.profileType === 'Burnout' || u.profileType === 'Disengaged') {
        coachingSessions.push({
          employeeId: u._id,
          conductedBy: u.managerId,
          scheduledAt: new Date(today.getTime() - randomInt(1, 15) * 86400000),
          status: 'completed',
          healthStatus: u.profileType === 'Burnout' ? 'needs-attention' : 'immediate-support',
          aiSummary: 'Synthetic AI Summary identifying performance risks.',
          isSynthetic: true,
          seededBatchId
        });
      }
    }

    if (attendances.length) await Attendance.collection.insertMany(attendances);
    if (tasks.length) await Task.collection.insertMany(tasks);
    if (trackers.length) await Tracker.collection.insertMany(trackers);
    if (coachingSessions.length) await CoachingSession.collection.insertMany(coachingSessions);

    // Benchmarking Phase
    const benchStart = Date.now();
    const benchUsers = await User.countDocuments({ role: 'employee' });
    const benchAtt = await Attendance.aggregate([{ $match: {} }, { $group: { _id: '$dayStatus', count: { $sum: 1 } } }]);
    const benchEnd = Date.now();

    return NextResponse.json({
      success: true,
      seededBatchId,
      timeTakenMs: Date.now() - startMs,
      generated: {
        users: users.length,
        attendances: attendances.length,
        tasks: tasks.length,
        trackers: trackers.length,
        coachingSessions: coachingSessions.length
      },
      benchmark: {
        dbLatencyMs: benchEnd - benchStart,
        totalEmployees: benchUsers,
        attendanceStats: benchAtt
      }
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
