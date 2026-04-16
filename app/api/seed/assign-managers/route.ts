import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 401 });
    }

    await connectDB();

    // Find all managers
    const managers = await User.find({ role: 'manager' }).select('_id fullName email').lean();
    if (managers.length === 0) {
      return NextResponse.json({ error: 'No managers found' }, { status: 400 });
    }

    // Find all employees without managerId
    const employees = await User.find({ role: 'employee', managerId: { $exists: false } }).select('_id fullName email').lean();

    if (employees.length === 0) {
      return NextResponse.json({ ok: true, message: 'All employees already have managers assigned' });
    }

    // Assign employees to managers round-robin
    const assignments = [];
    for (let i = 0; i < employees.length; i++) {
      const manager = managers[i % managers.length];
      await User.findByIdAndUpdate(employees[i]._id, { managerId: manager._id });
      assignments.push({
        employee: employees[i].fullName,
        manager: manager.fullName,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Assigned ${assignments.length} employees to managers`,
      assignments,
    });
  } catch (e: unknown) {
    console.error('Assign managers error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}