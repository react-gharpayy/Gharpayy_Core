import mongoose, { Schema, Document } from 'mongoose';

export interface ITracker extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD IST
  role: 'admin' | 'manager' | 'employee';
  initial: string;
  onIt: string;
  impact: string;
  notes: string;
  issues: string;
  status: 'draft' | 'submitted' | 'reviewed';
  drafts30: number;
  mytAdded: number;
  toursPipeline: number;
  toursDone: number;
  callsDone: number;
  connected: number;
  manualLeadsToday: number;
  manualToursToday: number;
  doubts: string;
  submittedAt?: Date;
  isSubmitted: boolean;
  isEdited: boolean;
  submissionStatus: 'pending' | 'submitted' | 'edited';
  isGoodWeek: boolean;
  adminNotes: string;
  adminImpact: string;
  adminIssues: string;
  reviewedAt?: Date;
  adminViewedAt?: Date;
  completionScore: number;
  dailyCheckins: {
    key: string;
    label: string;
    range: string;
    status: 'idle' | 'started' | 'completed';
    targetCount: number;
    progressNote: string;
    startedAt?: string;
    completedAt?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const TrackerSchema = new Schema<ITracker>({
  employeeId:       { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  date:             { type: String, required: true },
  role:             { type: String, enum: ['admin', 'manager', 'employee'], required: true },
  initial:          { type: String, default: '' },
  onIt:             { type: String, default: '' },
  impact:           { type: String, default: '' },
  notes:            { type: String, default: '' },
  issues:           { type: String, default: '' },
  status:           { type: String, enum: ['draft', 'submitted', 'reviewed'], default: 'draft' },
  drafts30:         { type: Number, default: 0 },
  mytAdded:         { type: Number, default: 0 },
  toursPipeline:    { type: Number, default: 0 },
  toursDone:        { type: Number, default: 0 },
  callsDone:        { type: Number, default: 0 },
  connected:        { type: Number, default: 0 },
  manualLeadsToday: { type: Number, default: 0 },
  manualToursToday: { type: Number, default: 0 },
  doubts:           { type: String, default: '' },
  submittedAt:      { type: Date, default: null },
  isSubmitted:      { type: Boolean, default: false },
  isEdited:         { type: Boolean, default: false },
  submissionStatus: { type: String, enum: ['pending', 'submitted', 'edited'], default: 'pending' },
  isGoodWeek:       { type: Boolean, default: false },
  adminNotes:       { type: String, default: '' },
  adminImpact:      { type: String, default: '' },
  adminIssues:      { type: String, default: '' },
  reviewedAt:       { type: Date, default: null },
  adminViewedAt:    { type: Date, default: null },
  completionScore:  { type: Number, default: 0 },
  dailyCheckins: [
    {
      key: { type: String, default: '' },
      label: { type: String, default: '' },
      range: { type: String, default: '' },
      status: { type: String, enum: ['idle', 'started', 'completed'], default: 'idle' },
      targetCount: { type: Number, default: 0 },
      progressNote: { type: String, default: '' },
      startedAt: { type: String, default: '' },
      completedAt: { type: String, default: '' },
      mytAdded: { type: Number, default: 0 },
      toursInPipeline: { type: Number, default: 0 },
      toursDone: { type: Number, default: 0 },
      callsDone: { type: Number, default: 0 },
      connected: { type: Number, default: 0 },
      mytWhoWillPayToday: { type: Number, default: 0 },
      tenantsPaid: { type: Number, default: 0 },
      doubts: { type: String, default: '' },
      problems: { type: String, default: '' },
    },
  ],
}, { timestamps: true });

TrackerSchema.index({ employeeId: 1, date: 1 }, { unique: true });
TrackerSchema.index({ date: 1 });

export default mongoose.models.GpTracker || mongoose.model<ITracker>('GpTracker', TrackerSchema);
