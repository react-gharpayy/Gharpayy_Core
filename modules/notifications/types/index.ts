export type NotificationType = 'LEAVE_STATUS' | 'KUDOS_RECEIVED' | 'KPI_ASSIGNED' | 'SPRINT_ASSIGNED' | 'ATTENDANCE_ALERT' | 'SYSTEM';

export interface INotification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStore {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}
