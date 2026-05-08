import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, verifyToken, COOKIE_NAME } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import IntegrationKey from '@/models/IntegrationKey';

export async function GET(req: NextRequest) {
  try {
    let user = await getAuthUser();
    if (!user) {
      const token = req.cookies.get(COOKIE_NAME)?.value;
      if (token) user = verifyToken(token);
    }
    if (!user || !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.CRM_BASE_URL || '';
    if (!baseUrl) return NextResponse.json({ ok: false, data: [] });

    await connectDB();
    const keyDoc = await IntegrationKey.findOne({ orgId: String(user.id) }).lean();
    if (!keyDoc?.key) {
      return NextResponse.json({ error: 'CRM integration key not connected' }, { status: 400 });
    }

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/integrations/crm/daily`, {
      headers: { 'x-integration-key': keyDoc.key },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'No body');
      console.error('CRM_API_ERROR:', res.status, text);
      return NextResponse.json({ error: `CRM API Error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('CRM_ROUTE_ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
