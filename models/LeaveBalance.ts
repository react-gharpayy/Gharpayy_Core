import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveBalance extends Document {
  employeeId: mongoose.Types.ObjectId;
  paid: number;
  sick: number;
  casual: number;
  compOff: number;
  lop: number;
  encashable: number;
  encashed: number;
  ratePerDay?: number;
  updatedAt: Date;
  createdAt: Date;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true, unique: true },
  paid:       { type: Number, default: 12 },
  sick:       { type: Number, default: 6 },
  casual:     { type: Number, default: 6 },
  compOff:    { type: Number, default: 0 },
  lop:        { type: Number, default: 0 },
  encashable: { type: Number, default: 0 },
  encashed:   { type: Number, default: 0 },
  ratePerDay: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.GpLeaveBalance || mongoose.model<ILeaveBalance>('GpLeaveBalance', LeaveBalanceSchema);
