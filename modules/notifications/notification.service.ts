import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Notification } from './notification.model';
import { NotificationType } from './types';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

import { notificationEmitter } from './emitter';

export class NotificationService {
  static async createNotification(params: CreateNotificationParams) {
    if (!mongoose.Types.ObjectId.isValid(params.userId)) return null;
    try {
      await connectDB();
      const notification = await Notification.create({
        ...params,
        isRead: false
      });
      
      // Emit realtime event
      notificationEmitter.emitNotification(params.userId, notification);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      // We don't want to break the main flow if notification fails
      return null;
    }
  }

  static async getNotifications(userId: string, limit = 20, page = 1) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return { notifications: [], unreadCount: 0 };
    await connectDB();
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    
    return { notifications, unreadCount };
  }

  static async markAsRead(notificationId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    await connectDB();
    return await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
  }

  static async markAllAsRead(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return { acknowledged: true, modifiedCount: 0 };
    await connectDB();
    return await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
  }
}
