import mongoose, { Schema, Document } from 'mongoose';

export interface ICompOffCredit extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  source: 'holiday' | 'week_off';
  attendanceId?: mongoose.Types.ObjectId;
  minutesWorked?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CompOffCreditSchema = new Schema<ICompOffCredit>({
  employeeId:   { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  date:         { type: String, required: true },
  source:       { type: String, enum: ['holiday','week_off'], required: true },
  attendanceId: { type: Schema.Types.ObjectId, ref: 'GpAttendance', default: null },
  minutesWorked:{ type: Number, default: 0 },
}, { timestamps: true });

CompOffCreditSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.models.GpCompOffCredit || mongoose.model<ICompOffCredit>('GpCompOffCredit', CompOffCreditSchema);
