import mongoose, { Schema, Document } from 'mongoose';

export type LeaveType = 'Paid' | 'Sick' | 'Casual' | 'Comp Off' | 'LOP';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface ILeave extends Document {
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  reason?: string;
  appliedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  approvedByName?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>({
  employeeId:      { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  employeeName:    { type: String, required: true },
  type:            { type: String, enum: ['Paid','Sick','Casual','Comp Off','LOP'], required: true },
  startDate:       { type: String, required: true },
  endDate:         { type: String, required: true },
  days:            { type: Number, required: true },
  status:          { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  reason:          { type: String, default: '' },
  appliedAt:       { type: Date, default: Date.now },
  approvedAt:      { type: Date, default: null },
  approvedBy:      { type: String, default: '' },
  approvedByName:  { type: String, default: '' },
  rejectedAt:      { type: Date, default: null },
  rejectedBy:      { type: String, default: '' },
  rejectedReason:  { type: String, default: '' },
}, { timestamps: true });

LeaveSchema.index({ employeeId: 1, startDate: 1 });
LeaveSchema.index({ status: 1, startDate: 1 });

export default mongoose.models.GpLeave || mongoose.model<ILeave>('GpLeave', LeaveSchema);
