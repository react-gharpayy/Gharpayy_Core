import Notice from '@/models/Notice';
import User from '@/models/User';
import { NotificationService } from '@/modules/notifications/notification.service';

type NoticeType = 'general' | 'warning' | 'urgent';

async function createSystemNoticeOnce(args: {
  key: string;
  date: string;
  title: string;
  message: string;
  type: NoticeType;
  targetId: string | null;
  targetName?: string | null;
}) {
  const createdBy = `system:${args.key}:${args.date}:${args.targetId || 'all'}`;
  const existing = await Notice.findOne({ createdBy, targetId: args.targetId ?? null }).select('_id').lean();
  if (existing) return false;

  await Notice.create({
    title: args.title,
    message: args.message,
    type: args.type,
    targetId: args.targetId ?? null,
    targetName: args.targetName ?? null,
    createdBy,
    createdByName: 'System',
    readBy: [],
  });

  // Also create a notification in the new system if there's a target user
  if (args.targetId) {
    await NotificationService.createNotification({
      userId: args.targetId,
      type: 'ATTENDANCE_ALERT',
      title: args.title,
      message: args.message,
      link: '/home',
      metadata: { key: args.key, date: args.date }
    });
  }

  return true;
}

async function notifyAdminsAndManagersOnce(args: {
  key: string;
  date: string;
  title: string;
  message: string;
  type: NoticeType;
}) {
  const reviewers = await User.find({ role: { $in: ['admin', 'manager'] } }, '_id fullName').lean() as any[];
  await Promise.all(
    reviewers.map((u) =>
      createSystemNoticeOnce({
        key: `${args.key}:reviewer`,
        date: args.date,
        title: args.title,
        message: args.message,
        type: args.type,
        targetId: String(u._id),
        targetName: u.fullName || null,
      }),
    ),
  );
}

export async function notifyLateAlert(args: {
  employeeId: string;
  employeeName: string;
  date: string;
  clockInLabel: string;
  lateByMins: number;
  shiftStart: string;
  graceMinutes: number;
}) {
  if (!args.lateByMins || args.lateByMins <= 0) return;
  
  const user = await User.findById(args.employeeId, 'role managerId').lean() as any;
  if (!user) return;

  const title = 'Late Attendance Alert';
  const message = `Late by ${args.lateByMins} mins (Shift ${args.shiftStart}, Grace ${args.graceMinutes}m, Clock-in ${args.clockInLabel} IST)`;

  // Personal notification - only for employees
  if (user.role === 'employee') {
    await createSystemNoticeOnce({
      key: 'late_alert_employee',
      date: args.date,
      title,
      message,
      type: 'warning',
      targetId: args.employeeId,
      targetName: args.employeeName,
    });
  }

  // Manager notification - only if employee has a manager
  if (user.managerId) {
    await createSystemNoticeOnce({
      key: `late_alert_mgr_${args.employeeId}`,
      date: args.date,
      title: `Late Alert: ${args.employeeName}`,
      message: `${args.employeeName} clocked in late by ${args.lateByMins} mins`,
      type: 'warning',
      targetId: String(user.managerId),
    });
  }
}

export async function notifyMissedClockOut(args: {
  employeeId: string;
  employeeName: string;
  date: string;
}) {
  const user = await User.findById(args.employeeId, 'role managerId').lean() as any;
  if (!user) return;

  // Personal notification - only for employees
  if (user.role === 'employee') {
    await createSystemNoticeOnce({
      key: 'missed_clock_out_employee',
      date: args.date,
      title: 'Missed Clock-out Auto-Closed',
      message: `Your ${args.date} session was auto-closed at day end. Raise an exception if correction is needed.`,
      type: 'warning',
      targetId: args.employeeId,
      targetName: args.employeeName,
    });
  }

  // Manager notification - only if employee has a manager
  if (user.managerId) {
    await createSystemNoticeOnce({
      key: `missed_clock_out_mgr_${args.employeeId}`,
      date: args.date,
      title: `Missed Clock-out: ${args.employeeName}`,
      message: `Auto-closed ${args.employeeName}'s open session for ${args.date}.`,
      type: 'warning',
      targetId: String(user.managerId),
    });
  }
}

export async function notifyDailySummary(args: {
  employeeId: string;
  employeeName: string;
  date: string;
  totalWorkMins: number;
  totalBreakMins: number;
  dayStatus: string;
  lateByMins: number;
  earlyByMins: number;
}) {
  const user = await User.findById(args.employeeId, 'role').lean() as any;
  if (!user || user.role !== 'employee') return;

  const workH = Math.floor((args.totalWorkMins || 0) / 60);
  const workM = (args.totalWorkMins || 0) % 60;
  const breakM = args.totalBreakMins || 0;
  const statusDetail = args.dayStatus === 'Late'
    ? `Late by ${args.lateByMins || 0}m`
    : args.dayStatus === 'Early'
      ? `Early by ${args.earlyByMins || 0}m`
      : args.dayStatus;

  await createSystemNoticeOnce({
    key: 'attendance_summary_employee',
    date: args.date,
    title: 'Attendance Summary',
    message: `${args.date}: ${workH}h ${workM}m worked, ${breakM}m break, status ${statusDetail}.`,
    type: 'general',
    targetId: args.employeeId,
    targetName: args.employeeName,
  });
}

