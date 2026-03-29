import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendancePolicy extends Document {
  orgId: mongoose.Types.ObjectId;

  // Late arrival
  lateGraceMinutes: number;
  lateMarkAfterMinutes: number;
  halfDayThresholdMinutes: number;
  absentThresholdMinutes: number;
  lateDeductionEnabled: boolean;
  lateDeductionPerIncident: number;

  // Working hours
  standardWorkingHoursPerDay: number;
  weeklyOffDays: string[];

  // Overtime
  overtimeEnabled: boolean;
  overtimeThresholdMinutes: number;
  overtimeMultiplier: number;
  maxOvertimeHoursPerDay: number;
  maxOvertimeHoursPerMonth: number;

  // Auto absent
  autoMarkAbsent: boolean;
  autoMarkAbsentAfterMidnight: boolean;

  updatedBy?: mongoose.Types.ObjectId;
  updatedAt?: Date;
  createdAt?: Date;
}

const AttendancePolicySchema = new Schema<IAttendancePolicy>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Late arrival
    lateGraceMinutes: { type: Number, default: 10, min: 0, max: 60 },
    lateMarkAfterMinutes: { type: Number, default: 15, min: 0, max: 120 },
    halfDayThresholdMinutes: { type: Number, default: 120, min: 60, max: 300 },
    absentThresholdMinutes: { type: Number, default: 240, min: 120, max: 480 },
    lateDeductionEnabled: { type: Boolean, default: false },
    lateDeductionPerIncident: { type: Number, default: 0, min: 0, max: 500 },

    // Working hours
    standardWorkingHoursPerDay: { type: Number, default: 8, min: 4, max: 12 },
    weeklyOffDays: { type: [String], default: ['Sun'], enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },

    // Overtime
    overtimeEnabled: { type: Boolean, default: true },
    overtimeThresholdMinutes: { type: Number, default: 30, min: 0, max: 120 },
    overtimeMultiplier: { type: Number, default: 1.5, min: 1, max: 5 },
    maxOvertimeHoursPerDay: { type: Number, default: 4, min: 0, max: 12 },
    maxOvertimeHoursPerMonth: { type: Number, default: 50, min: 0, max: 100 },

    // Auto absent
    autoMarkAbsent: { type: Boolean, default: true },
    autoMarkAbsentAfterMidnight: { type: Boolean, default: true },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const AttendancePolicy: Model<IAttendancePolicy> =
  mongoose.models.AttendancePolicy ||
  mongoose.model<IAttendancePolicy>('AttendancePolicy', AttendancePolicySchema);

export default AttendancePolicy;
