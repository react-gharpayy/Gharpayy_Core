import { EventEmitter } from 'events';

class NotificationEmitter extends EventEmitter {
  public emitNotification(userId: string, notification: any) {
    this.emit(`notification:${userId}`, notification);
  }
}

// Global singleton to ensure we use the same emitter across API routes
const globalForEmitter = global as unknown as { notificationEmitter: NotificationEmitter };
export const notificationEmitter = globalForEmitter.notificationEmitter || new NotificationEmitter();

if (process.env.NODE_ENV !== 'production') globalForEmitter.notificationEmitter = notificationEmitter;
