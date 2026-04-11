import mongoose, { Schema, Document, Model } from 'mongoose';

export type WeeklyTrackerStatus = 'draft' | 'submitted' | 'reviewed';

export interface IWeeklyTracker extends Document {
  employeeId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  employeeName?: string;
  role?: string;
  teamName?: string;
  department?: string;
  year: number;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  drafts30: number;
  mytAdded: number;
  toursPipeline: number;
  toursDone: number;
  callsDone: number;
  connected: number;
  doubts: string;
  manualLeadsToday: number;
  manualToursToday: number;
  g1: { target: number; actual: number; notes: string };
  g2: { target: number; actual: number; notes: string };
  g3: { target: number; actual: number; notes: string };
  g4: { target: number; actual: number; notes: string };
  glTours: { target: number; actual: number; locations: string };
  initial: string;
  onIt: string;
  impact: string;
  notes: string;
  issues: string;
  status: WeeklyTrackerStatus;
  submittedAt?: Date;
  isGoodWeek: boolean;
  adminNotes?: string;
  adminImpact?: string;
  adminIssues?: string;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema({
  target: { type: Number, default: 0, min: 0 },
  actual: { type: Number, default: 0, min: 0 },
  notes: { type: String, default: '', maxlength: 500 },
}, { _id: false });

const WeeklyTrackerSchema = new Schema<IWeeklyTracker>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  orgId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  employeeName: { type: String, default: '' },
  role: { type: String, default: '' },
  teamName: { type: String, default: '' },
  department: { type: String, default: '' },
  year: { type: Number, required: true },
  weekNumber: { type: Number, required: true, min: 1, max: 44 },
  weekStartDate: { type: String, required: true },
  weekEndDate: { type: String, required: true },
  drafts30: { type: Number, default: 0, min: 0 },
  mytAdded: { type: Number, default: 0, min: 0 },
  toursPipeline: { type: Number, default: 0, min: 0 },
  toursDone: { type: Number, default: 0, min: 0 },
  callsDone: { type: Number, default: 0, min: 0 },
  connected: { type: Number, default: 0, min: 0 },
  doubts: { type: String, default: '', maxlength: 2000 },
  manualLeadsToday: { type: Number, default: 0, min: 0 },
  manualToursToday: { type: Number, default: 0, min: 0 },
  g1: { type: GoalSchema, default: () => ({}) },
  g2: { type: GoalSchema, default: () => ({}) },
  g3: { type: GoalSchema, default: () => ({}) },
  g4: { type: GoalSchema, default: () => ({}) },
  glTours: {
    target: { type: Number, default: 0, min: 0 },
    actual: { type: Number, default: 0, min: 0 },
    locations: { type: String, default: '', maxlength: 500 },
  },
  initial: { type: String, default: '' },
  onIt: { type: String, default: '' },
  impact: { type: String, default: '' },
  notes: { type: String, default: '' },
  issues: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'submitted', 'reviewed'], default: 'draft' },
  submittedAt: { type: Date, default: null },
  isGoodWeek: { type: Boolean, default: false },
  adminNotes: { type: String, default: '' },
  adminImpact: { type: String, default: '' },
  adminIssues: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'GpAttUser', default: null },
}, { timestamps: true });

WeeklyTrackerSchema.index({ employeeId: 1, year: 1, weekNumber: 1 }, { unique: true });
WeeklyTrackerSchema.index({ orgId: 1, year: 1, weekNumber: 1 });

const WeeklyTracker: Model<IWeeklyTracker> =
  mongoose.models.GpWeeklyTracker ||
  mongoose.model<IWeeklyTracker>('GpWeeklyTracker', WeeklyTrackerSchema);

export default WeeklyTracker;

