import mongoose, { Schema, Document } from 'mongoose';

export type LeaveType = 'casual' | 'sick' | 'earned' | 'comp_off' | 'lop' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ILeave extends Document {
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: Date;
  isHalfDay: boolean;
  halfDaySession?: 'morning' | 'afternoon';
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>({
  employeeId:      { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  employeeName:    { type: String, required: true },
  leaveType:       { type: String, enum: ['casual', 'sick', 'earned', 'comp_off', 'lop', 'other'], required: true },
  startDate:       { type: String, required: true },
  endDate:         { type: String, required: true },
  totalDays:       { type: Number, required: true, min: 0.5 },
  reason:          { type: String, required: true, maxlength: 500 },
  status:          { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  reviewedBy:      { type: String, default: null },
  reviewedByName:  { type: String, default: null },
  reviewNote:      { type: String, default: '' },
  reviewedAt:      { type: Date, default: null },
  isHalfDay:       { type: Boolean, default: false },
  halfDaySession:  { type: String, enum: ['morning', 'afternoon', null], default: null },
}, { timestamps: true });

LeaveSchema.index({ employeeId: 1, status: 1 });
LeaveSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.models.GpLeave ||
  mongoose.model<ILeave>('GpLeave', LeaveSchema);
