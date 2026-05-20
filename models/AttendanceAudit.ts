import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceAudit extends Document {
  employeeId: mongoose.Types.ObjectId;
  attendanceId: mongoose.Types.ObjectId | null;
  action: 'check_in' | 'check_out' | 'break_start' | 'break_end' | 'field_exit' | 'field_return' | 'auto_close' | 'correction' | 'anomaly_detected';
  date: string;
  timestamp: Date;
  actorId: mongoose.Types.ObjectId; // Who did it (can be employee or admin)
  previousState?: any;
  newState?: any;
  metadata?: any;
}

const AttendanceAuditSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  attendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance' },
  action: { type: String, required: true },
  date: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  previousState: { type: Schema.Types.Mixed },
  newState: { type: Schema.Types.Mixed },
  metadata: { type: Schema.Types.Mixed },
});

AttendanceAuditSchema.index({ employeeId: 1, date: -1 });
AttendanceAuditSchema.index({ date: 1 });
AttendanceAuditSchema.index({ timestamp: -1 });

export default mongoose.models.AttendanceAudit || mongoose.model<IAttendanceAudit>('AttendanceAudit', AttendanceAuditSchema);
