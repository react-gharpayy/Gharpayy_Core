import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveBalance extends Document {
  employeeId: mongoose.Types.ObjectId;
  year: number; // e.g. 2026
  casual:   { total: number; used: number; pending: number };
  sick:     { total: number; used: number; pending: number };
  earned:   { total: number; used: number; pending: number };
  comp_off: { total: number; used: number; pending: number };
  updatedAt: Date;
}

const BalanceEntrySchema = new Schema({
  total:   { type: Number, default: 0 },
  used:    { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
}, { _id: false });

const LeaveBalanceSchema = new Schema<ILeaveBalance>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  year:       { type: Number, required: true },
  casual:     { type: BalanceEntrySchema, default: () => ({ total: 12, used: 0, pending: 0 }) },
  sick:       { type: BalanceEntrySchema, default: () => ({ total: 8,  used: 0, pending: 0 }) },
  earned:     { type: BalanceEntrySchema, default: () => ({ total: 15, used: 0, pending: 0 }) },
  comp_off:   { type: BalanceEntrySchema, default: () => ({ total: 0,  used: 0, pending: 0 }) },
}, { timestamps: true });

LeaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

export default mongoose.models.GpLeaveBalance ||
  mongoose.model<ILeaveBalance>('GpLeaveBalance', LeaveBalanceSchema);
