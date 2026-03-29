import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendancePolicy extends Document {
  name: string;
  isDefault: boolean;
  shiftType?: 'FT_MAIN' | 'FT_EARLY' | 'INTERN_DAY' | 'CUSTOM';
  workStart?: string;
  workEnd?: string;
  breaks?: { name: string; start: string; end: string; durationMinutes: number }[];
  weekOffs?: string[];
  graceMinutes?: number;
  latePenaltyEnabled?: boolean;
  latePenaltyType?: 'fixed' | 'per_minute';
  latePenaltyValue?: number;
  lopDeductionEnabled?: boolean;
  overtimeEnabled?: boolean;
  overtimeAfterMinutes?: number;
  compOffEnabled?: boolean;
  holidayExclusionEnabled?: boolean;
  weeklyOffExclusionEnabled?: boolean;
  ipRestrictionEnabled?: boolean;
  allowedIPs?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BreakSchema = new Schema({
  name:            { type: String, default: '' },
  start:           { type: String, default: '' },
  end:             { type: String, default: '' },
  durationMinutes: { type: Number, default: 0 },
}, { _id: false });

const AttendancePolicySchema = new Schema<IAttendancePolicy>({
  name:                     { type: String, required: true, trim: true },
  isDefault:                { type: Boolean, default: false },
  shiftType:                { type: String, enum: ['FT_MAIN','FT_EARLY','INTERN_DAY','CUSTOM'], default: 'CUSTOM' },
  workStart:                { type: String, default: '' },
  workEnd:                  { type: String, default: '' },
  breaks:                   { type: [BreakSchema], default: [] },
  weekOffs:                 { type: [String], default: [] },
  graceMinutes:             { type: Number, default: 15 },
  latePenaltyEnabled:       { type: Boolean, default: false },
  latePenaltyType:          { type: String, enum: ['fixed','per_minute'], default: 'fixed' },
  latePenaltyValue:         { type: Number, default: 0 },
  lopDeductionEnabled:      { type: Boolean, default: false },
  overtimeEnabled:          { type: Boolean, default: false },
  overtimeAfterMinutes:     { type: Number, default: 0 },
  compOffEnabled:           { type: Boolean, default: false },
  holidayExclusionEnabled:  { type: Boolean, default: true },
  weeklyOffExclusionEnabled:{ type: Boolean, default: true },
  ipRestrictionEnabled:     { type: Boolean, default: false },
  allowedIPs:               { type: [String], default: [] },
}, { timestamps: true });

AttendancePolicySchema.index({ isDefault: 1 });

export default mongoose.models.GpAttendancePolicy || mongoose.model<IAttendancePolicy>('GpAttendancePolicy', AttendancePolicySchema);
