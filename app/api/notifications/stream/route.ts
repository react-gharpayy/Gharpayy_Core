import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { notificationEmitter } from '@/modules/notifications/emitter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const userId = user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const listener = (notification: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(notification)}\n\n`));
      };

      notificationEmitter.on(`notification:${userId}`, listener);

      // Keep connection alive with a heartbeat every 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);

      req.signal.onabort = () => {
        notificationEmitter.off(`notification:${userId}`, listener);
        clearInterval(heartbeat);
        controller.close();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
