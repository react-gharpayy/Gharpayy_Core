import { handleMarkAllAsRead } from '@/modules/notifications/api/handlers';

export async function PATCH() {
  return handleMarkAllAsRead();
}
