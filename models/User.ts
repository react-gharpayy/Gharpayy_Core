import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  // sub_admin added - DO NOT remove existing roles
  role: 'admin' | 'manager' | 'employee';
  dateOfBirth?: string;
  jobRole?: 'full-time' | 'intern';
  profilePhoto?: string;
  officeZoneId?: mongoose.Types.ObjectId;
  isApproved?: boolean;
  managerId?: mongoose.Types.ObjectId;
  teamName?: string;
  department?: string;
  playbookRole?: string;
  activeSessionToken?: string;
  activeSessionAt?: Date;
  lastSeenAt?: Date;
  // ── Hierarchy fields (added for flexible role system) ──────────────────────
  /** Reference to a HierarchyRole document for display/custom role names */
  hierarchyRoleId?: mongoose.Types.ObjectId;
  /** Reference to the Team this user belongs to */
  teamId?: mongoose.Types.ObjectId;
  /**
   * Display job title — separate from hierarchy role and playbook role.
   * Examples: "HR Executive", "Senior Recruiter", "Engineering Lead"
   * This is purely for display; it does NOT affect permissions.
   */
  jobTitle?: string;
  /**
   * The permission tier used for access control.
   * Maps to ROLE_PERMISSIONS keys in lib/permissions.ts.
   * Defaults to the value of `role` for backward compatibility.
   * Valid: 'admin' | 'manager' | 'team_lead' | 'hr' | 'employee'
   */
  systemRole?: string;
  workSchedule?: {
    shiftType?: 'FT_MAIN' | 'FT_EARLY' | 'INTERN_DAY' | 'CUSTOM';
    startTime: string;
    endTime: string;
    breakDuration: number;
    breaks?: { name: string; start: string; end: string; durationMinutes: number }[];
    weekOffs?: string[];
    isCustomShift?: boolean;
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
  role:         { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
  dateOfBirth:  { type: String },
  jobRole:      { type: String, enum: ['full-time', 'intern'] },
  profilePhoto: { type: String },
  officeZoneId: { type: Schema.Types.ObjectId, ref: 'GpOfficeZone' },
  isApproved:   { type: Boolean, default: false },
  managerId:    { type: Schema.Types.ObjectId, ref: 'GpAttUser', default: null },
  teamName:     { type: String, default: '' },
  department:   { type: String, default: '' },
  playbookRole: { type: String, default: 'recruiter' },
  activeSessionToken: { type: String, default: null },
  activeSessionAt: { type: Date, default: null },
  lastSeenAt: { type: Date, default: null },
  // ── Hierarchy fields ───────────────────────────────────────────────────────
  hierarchyRoleId: { type: Schema.Types.ObjectId, ref: 'GpHierarchyRole', default: null },
  teamId:          { type: Schema.Types.ObjectId, ref: 'GpTeam', default: null },
  jobTitle:        { type: String, default: '' },
  /**
   * Permission tier for access control. Falls back to `role` field when absent/null.
   * No enum constraint here — validation is handled in lib/permissions.ts.
   * Valid values: 'admin' | 'manager' | 'team_lead' | 'hr' | 'employee'
   */
  systemRole: { type: String, default: null },
  workSchedule: { type: WorkScheduleSchema, default: () => ({}) },
  leaves:       { type: [LeaveSchema], default: [] },
}, { 
  timestamps: true,
  collection: 'gpattusers'
});

UserSchema.index({ role: 1, isApproved: 1 });
UserSchema.index({ officeZoneId: 1, role: 1 });
UserSchema.index({ managerId: 1 });
UserSchema.index({ teamId: 1 });

export default mongoose.models?.GpAttUser || mongoose.model('GpAttUser', UserSchema);
