import { handleGetNotifications } from '@/modules/notifications/api/handlers';

export async function GET(req: any) {
  return handleGetNotifications(req);
}
