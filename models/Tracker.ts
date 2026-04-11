import mongoose, { Schema, Document } from 'mongoose';

export interface ITracker extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD IST
  role: 'admin' | 'sub_admin' | 'manager' | 'employee';
  initial: string;
  onIt: string;
  impact: string;
  notes: string;
  issues: string;
  submittedAt?: Date;
  isSubmitted: boolean;
  isEdited: boolean;
  submissionStatus: 'pending' | 'submitted' | 'edited';
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
  role:             { type: String, enum: ['admin', 'sub_admin', 'manager', 'employee'], required: true },
  initial:          { type: String, default: '' },
  onIt:             { type: String, default: '' },
  impact:           { type: String, default: '' },
  notes:            { type: String, default: '' },
  issues:           { type: String, default: '' },
  submittedAt:      { type: Date, default: null },
  isSubmitted:      { type: Boolean, default: false },
  isEdited:         { type: Boolean, default: false },
  submissionStatus: { type: String, enum: ['pending', 'submitted', 'edited'], default: 'pending' },
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
    },
  ],
}, { timestamps: true });

TrackerSchema.index({ employeeId: 1, date: 1 }, { unique: true });
TrackerSchema.index({ date: 1 });

export default mongoose.models.GpTracker || mongoose.model<ITracker>('GpTracker', TrackerSchema);
