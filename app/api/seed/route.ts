import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import OfficeZone from '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';
import { BCRYPT_SALT_ROUNDS } from '@/lib/constants';

export async function GET() {
  try {
    // Only allow in development or for admin users
    if (process.env.NODE_ENV === 'production') {
      const user = await getAuthUser();
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    await connectDB();

    // Reset office zones
    await OfficeZone.deleteMany({});
    const zones = [
      { name: 'MWB MORE' },
      { name: 'KORA CORE' },
      { name: 'YPR MAIN' },
      { name: 'MTECH HUB' },
      { name: 'HOMES Kora' },
      { name: 'HOMES mwb' },
    ];

    const zoneResults = [];
    for (const zone of zones) {
      const created = await OfficeZone.create(zone);
      zoneResults.push({ name: created.name, status: 'created', id: created._id.toString() });
    }

    // Seed employee accounts (approved for convenience)
    const employees = [
      { fullName: 'Satvik Sharma', email: 'satvik.gharpayy@gmail.com', role: 'employee' },
      { fullName: 'Pulkit Gupta', email: 'pulkit.gharpayy@gmail.com', role: 'employee' },
      { fullName: 'Sidhant Verma', email: 'siddhant.gharpayy@gmail.com', role: 'employee' },
      { fullName: 'Nayana Pillai', email: 'nayana.gharpayy@gmail.com', role: 'employee' },
      { fullName: 'Ammar Logade', email: 'ammar.gharpayy@gmail.com', role: 'employee' },
    ];

    const hash = await bcrypt.hash('Pass@1234', BCRYPT_SALT_ROUNDS);
    const empResults = [];

    for (const emp of employees) {
      const existing = await User.findOne({ email: emp.email });
      if (existing) {
        empResults.push({ email: emp.email, status: 'already exists' });
        continue;
      }
      const created = await User.create({ ...emp, password: hash, isApproved: true });
      empResults.push({ email: created.email, status: 'created', id: created._id.toString() });
    }

    return NextResponse.json({ ok: true, zones: zoneResults, employees: empResults });
  } catch (e: unknown) {
    console.error('Seed error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
