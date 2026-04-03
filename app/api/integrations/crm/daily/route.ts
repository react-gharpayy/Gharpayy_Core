import { NextResponse } from 'next/server';
import { getIntegrationToken } from '@/lib/integration-auth';

export async function GET() {
  try {
    const baseUrl = process.env.CRM_BASE_URL || '';
    if (!baseUrl) return NextResponse.json({ error: 'CRM_BASE_URL is not set' }, { status: 500 });

    const token = getIntegrationToken({ service: 'attendance' });
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/integrations/crm/daily`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
