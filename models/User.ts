import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  // sub_admin added - DO NOT remove existing roles
  role: 'admin' | 'sub_admin' | 'manager' | 'employee';
  dateOfBirth?: string;
  jobRole?: 'full-time' | 'intern';
  profilePhoto?: string;
  officeZoneId?: mongoose.Types.ObjectId;
  // assignedTeamId: only used by sub_admin to scope their team
  assignedTeamId?: mongoose.Types.ObjectId;
  isApproved?: boolean;
  managerId?: mongoose.Types.ObjectId;
  teamName?: string;
  department?: string;
  workSchedule?: {
    shiftType?: 'FT_MAIN' | 'FT_EARLY' | 'INTERN_DAY' | 'CUSTOM';
    startTime: string;
    endTime: string;
    breakDuration: number;
    breaks?: { name: string; start: string; end: string; durationMinutes: number }[];
    weekOffs?: string[];
    isCustomShift?: boolean;
    isLocked: boolean;
    setBy: 'employee' | 'admin';
  };
  leaves?: {
    date: string;
    type: 'day_off';
    status: 'approved';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkBreakSchema = new Schema({
  name:            { type: String, default: '' },
  start:           { type: String, default: '' },
  end:             { type: String, default: '' },
  durationMinutes: { type: Number, default: 0 },
}, { _id: false });

const WorkScheduleSchema = new Schema({
  shiftType:     { type: String, enum: ['FT_MAIN', 'FT_EARLY', 'INTERN_DAY', 'CUSTOM'], default: 'CUSTOM' },
  startTime:     { type: String, default: '' },
  endTime:       { type: String, default: '' },
  breakDuration: { type: Number, default: 0 },
  breaks:        { type: [WorkBreakSchema], default: [] },
  weekOffs:      { type: [String], default: [] },
  isCustomShift: { type: Boolean, default: false },
  isLocked:      { type: Boolean, default: false },
  setBy:         { type: String, enum: ['employee', 'admin'], default: 'employee' },
}, { _id: false });

const LeaveSchema = new Schema({
  date:   { type: String, required: true },
  type:   { type: String, enum: ['day_off'], default: 'day_off' },
  status: { type: String, enum: ['approved'], default: 'approved' },
}, { _id: false });

const UserSchema = new Schema({
  fullName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  // sub_admin added to enum - existing users unaffected (MongoDB ignores enum on existing docs)
  role:         { type: String, enum: ['admin', 'sub_admin', 'manager', 'employee'], default: 'employee' },
  dateOfBirth:  { type: String },
  jobRole:      { type: String, enum: ['full-time', 'intern'] },
  profilePhoto: { type: String },
  officeZoneId: { type: Schema.Types.ObjectId, ref: 'GpOfficeZone' },
  // assignedTeamId: the OfficeZone this sub_admin is responsible for
  assignedTeamId: { type: Schema.Types.ObjectId, ref: 'GpOfficeZone', default: null },
  isApproved:   { type: Boolean, default: false },
  managerId:    { type: Schema.Types.ObjectId, ref: 'GpAttUser', default: null },
  teamName:     { type: String, default: '' },
  department:   { type: String, default: '' },
  workSchedule: { type: WorkScheduleSchema, default: () => ({}) },
  leaves:       { type: [LeaveSchema], default: [] },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

export default mongoose.models.GpAttUser || mongoose.model('GpAttUser', UserSchema);
