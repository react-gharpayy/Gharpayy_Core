import { handleMarkAsRead } from '@/modules/notifications/api/handlers';

export async function PATCH(req: any, ctx: any) {
  return handleMarkAsRead(req, ctx);
}
