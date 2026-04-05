import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import IntegrationKey from '@/models/IntegrationKey';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.CRM_BASE_URL || '';
    if (!baseUrl) return NextResponse.json({ error: 'CRM_BASE_URL is not set' }, { status: 500 });

    await connectDB();
    const keyDoc = await IntegrationKey.findOne({ orgId: String(user.id) }).lean();
    if (!keyDoc?.key) {
      return NextResponse.json({ error: 'CRM integration key not connected' }, { status: 400 });
    }

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/integrations/crm/daily`, {
      headers: { 'x-integration-key': keyDoc.key },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
