import mongoose, { Schema, Document } from 'mongoose';

// Goal entry — target vs actual
export interface IGoalEntry {
  target: number;  // what was planned
  actual: number;  // what was achieved
  notes: string;
}

export interface IWeeklyTracker extends Document {
  employeeId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  year: number;         // e.g. 2026
  weekNumber: number;   // 1–44
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string;   // YYYY-MM-DD

  // 4 configurable goals per week
  g1: IGoalEntry; // e.g. Calls Made
  g2: IGoalEntry; // e.g. Leads Added
  g3: IGoalEntry; // e.g. Follow-ups Done
  g4: IGoalEntry; // e.g. Closures / Conversions

  // GL Tours = Ground Level Site Visits
  glTours: {
    target: number;
    actual: number;
    locations: string; // optional comma-separated locations
  };

  // Admin evaluation
  isGoodWeek: boolean;       // admin marks: was this a good week?
  adminNotes: string;        // admin remarks
  impact: string;            // impact notes
  issues: string;            // any issues noted

  // Employee self-assessment
  selfRating: number;        // 1–5
  selfNotes: string;

  status: 'draft' | 'submitted' | 'reviewed';
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
}

const GoalEntrySchema = new Schema({
  target: { type: Number, default: 0 },
  actual: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { _id: false });

const WeeklyTrackerSchema = new Schema<IWeeklyTracker>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  orgId:      { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  year:       { type: Number, required: true },
  weekNumber: { type: Number, required: true, min: 1, max: 44 },
  weekStartDate: { type: String, required: true },
  weekEndDate:   { type: String, required: true },

  g1: { type: GoalEntrySchema, default: () => ({ target: 0, actual: 0, notes: '' }) },
  g2: { type: GoalEntrySchema, default: () => ({ target: 0, actual: 0, notes: '' }) },
  g3: { type: GoalEntrySchema, default: () => ({ target: 0, actual: 0, notes: '' }) },
  g4: { type: GoalEntrySchema, default: () => ({ target: 0, actual: 0, notes: '' }) },

  glTours: {
    target:    { type: Number, default: 0 },
    actual:    { type: Number, default: 0 },
    locations: { type: String, default: '' },
  },

  isGoodWeek:  { type: Boolean, default: false },
  adminNotes:  { type: String, default: '' },
  impact:      { type: String, default: '' },
  issues:      { type: String, default: '' },

  selfRating:  { type: Number, default: 0, min: 0, max: 5 },
  selfNotes:   { type: String, default: '' },

  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed'],
    default: 'draft',
  },
  submittedAt: { type: Date },
  reviewedAt:  { type: Date },
  reviewedBy:  { type: Schema.Types.ObjectId, ref: 'GpAttUser' },
}, { timestamps: true });

// One tracker entry per employee per week per year
WeeklyTrackerSchema.index({ employeeId: 1, year: 1, weekNumber: 1 }, { unique: true });
// Efficient org-wide queries
WeeklyTrackerSchema.index({ orgId: 1, year: 1, weekNumber: 1 });

const WeeklyTracker =
  mongoose.models.WeeklyTracker ||
  mongoose.model<IWeeklyTracker>('WeeklyTracker', WeeklyTrackerSchema);

export default WeeklyTracker;
