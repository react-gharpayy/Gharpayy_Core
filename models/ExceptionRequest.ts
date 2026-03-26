import mongoose, { Schema, Document } from 'mongoose';

export interface IExceptionRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  type: 'missed_punch' | 'break_overrun' | 'manual_entry' | 'geo_failure' | 'early_exit';
  date: string;
  reason: string;
  requestedTime?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExceptionRequestSchema = new Schema<IExceptionRequest>({
  employeeId:     { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  employeeName:   { type: String, required: true },
  type:           { type: String, enum: ['missed_punch', 'break_overrun', 'manual_entry', 'geo_failure', 'early_exit'], required: true },
  date:           { type: String, required: true },
  reason:         { type: String, required: true },
  requestedTime:  { type: String, default: null },
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:     { type: String, default: null },
  reviewedByName: { type: String, default: null },
  reviewNote:     { type: String, default: '' },
  reviewedAt:     { type: Date, default: null },
}, { timestamps: true });

ExceptionRequestSchema.index({ employeeId: 1, status: 1 });

export default mongoose.models.GpException || mongoose.model<IExceptionRequest>('GpException', ExceptionRequestSchema);