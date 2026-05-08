import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { kudosStore } from '@/lib/kudos-store';
import { NotificationService } from '@/modules/notifications/notification.service';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const kudos = await kudosStore.getKudos();
    return NextResponse.json({ kudos });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { toId, toName, tag, message } = await req.json();
    
    if (!toId || !toName || !tag || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (message.length < 5) {
      return NextResponse.json({ error: 'Message must be at least 5 characters' }, { status: 400 });
    }
    
    try {
      const newKudo = await kudosStore.giveKudo(
        user.id,
        user.fullName || user.email,
        toId,
        toName,
        tag,
        message
      );

      // Notify recipient
      await NotificationService.createNotification({
        userId: toId,
        type: 'KUDOS_RECEIVED',
        title: 'New Kudo Received! 🌟',
        message: `${user.fullName || user.email} gave you a kudo for being "${tag}"!`,
        link: '/kudos',
        metadata: { kudoId: newKudo.id, fromName: user.fullName || user.email }
      });

      return NextResponse.json({ ok: true, kudo: newKudo });
    } catch (err: any) {
      if (err.message === 'Daily limit reached') {
        return NextResponse.json({ error: 'Daily limit reached' }, { status: 429 });
      }
      throw err;
    }
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
