import AttendanceAudit from '@/models/AttendanceAudit';
import { connectDB } from './db';

interface AuditParams {
  employeeId: string;
  attendanceId?: string;
  action: string;
  date: string;
  actorId: string;
  previousState?: any;
  newState?: any;
  metadata?: any;
}

export async function logAttendanceAudit(params: AuditParams) {
  try {
    await connectDB();
    // Fire and forget, don't await to block APIs
    AttendanceAudit.create({
      employeeId: params.employeeId,
      attendanceId: params.attendanceId || null,
      action: params.action,
      date: params.date,
      timestamp: new Date(),
      actorId: params.actorId,
      previousState: params.previousState,
      newState: params.newState,
      metadata: params.metadata,
    }).catch(err => console.error('Failed to write audit log:', err));
  } catch (err) {
    console.error('Audit logger connection error:', err);
  }
}
