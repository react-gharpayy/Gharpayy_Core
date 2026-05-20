import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Task from '@/models/Task';
import Tracker from '@/models/Tracker';
import CoachingSession from '@/models/CoachingSession';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'DEV ONLY' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { confirm, seededBatchId } = body;

    if (confirm !== 'I_AM_SURE') {
      return NextResponse.json({ error: 'Missing explicit confirmation' }, { status: 400 });
    }

    await connectDB();
    const filter = seededBatchId ? { isSynthetic: true, seededBatchId } : { isSynthetic: true };

    const delUsers = await User.collection.deleteMany(filter);
    const delAtt = await Attendance.collection.deleteMany(filter);
    const delTasks = await Task.collection.deleteMany(filter);
    const delTrackers = await Tracker.collection.deleteMany(filter);
    const delCoach = await CoachingSession.collection.deleteMany(filter);
    
    let delZones = { deletedCount: 0 };
    try { delZones = await mongoose.connection.collection('gpofficezones').deleteMany(filter); } catch {}
    
    let delKudos = { deletedCount: 0 };
    try { delKudos = await mongoose.connection.collection('kudos').deleteMany(filter); } catch {}

    return NextResponse.json({
      success: true,
      cleaned: {
        users: delUsers.deletedCount,
        attendances: delAtt.deletedCount,
        tasks: delTasks.deletedCount,
        trackers: delTrackers.deletedCount,
        coachingSessions: delCoach.deletedCount,
        officeZones: delZones.deletedCount,
        kudos: delKudos.deletedCount
      }
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
