import mongoose, { Schema, Document } from 'mongoose';

export interface ICoachingActionItem {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: Date;
  completedNote?: string;
  linkedTaskId?: mongoose.Types.ObjectId;
}

export interface ICoachingSession extends Document {
  // Participants
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  employeeRole?: string;
  conductedBy: string; // admin/manager user id
  conductedByName: string;

  // Schedule
  scheduledAt: Date;
  duration: number; // minutes
  meetingType: 'in-person' | 'google-meet' | 'zoom' | 'teams' | 'custom' | 'remote';
  meetingLink?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'missed';

  // Recurrence
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly';
  recurringGroupId?: string; // links recurring sessions together

  // Content
  agendaItems: string[];
  sharedNotes: string;       // visible to admin + employee
  privateNotes: string;      // admin ONLY - never exposed to employees
  discussionPoints: string[]; // auto-generated suggestions (stored after session)

  // Health Status
  healthStatus: 'doing-well' | 'needs-attention' | 'immediate-support';
  healthNote?: string;

  // Action Items
  actionItems: ICoachingActionItem[];

  // AI Summary
  aiSummary?: string;
  aiWins?: string[];
  aiBlockers?: string[];
  aiFollowUp?: string;

  // Template
  templateId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const ActionItemSchema = new Schema<ICoachingActionItem>({
  title:        { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  dueDate:      { type: String, default: null },
  status:       { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  completedAt:  { type: Date, default: null },
  completedNote:{ type: String, default: '' },
  linkedTaskId: { type: Schema.Types.ObjectId, ref: 'GpTask', default: null },
}, { _id: true });

const CoachingSessionSchema = new Schema<ICoachingSession>({
  employeeId:          { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  employeeName:        { type: String, required: true, trim: true },
  employeeRole:        { type: String, default: '' },
  conductedBy:         { type: String, required: true },
  conductedByName:     { type: String, required: true },

  scheduledAt:         { type: Date, required: true },
  duration:            { type: Number, default: 30 },
  meetingType:         { type: String, enum: ['in-person', 'google-meet', 'zoom', 'teams', 'custom', 'remote'], default: 'in-person' },
  meetingLink:         { type: String, default: '' },
  status:              { type: String, enum: ['scheduled', 'completed', 'cancelled', 'missed'], default: 'scheduled' },

  isRecurring:         { type: Boolean, default: false },
  recurringFrequency:  { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: null },
  recurringGroupId:    { type: String, default: null },

  agendaItems:         { type: [String], default: [] },
  sharedNotes:         { type: String, default: '' },
  privateNotes:        { type: String, default: '' },
  discussionPoints:    { type: [String], default: [] },

  healthStatus:        { type: String, enum: ['doing-well', 'needs-attention', 'immediate-support'], default: 'doing-well' },
  healthNote:          { type: String, default: '' },

  actionItems:         { type: [ActionItemSchema], default: [] },

  aiSummary:           { type: String, default: '' },
  aiWins:              { type: [String], default: [] },
  aiBlockers:          { type: [String], default: [] },
  aiFollowUp:          { type: String, default: '' },

  templateId:          { type: Schema.Types.ObjectId, ref: 'GpCoachingTemplate', default: null },
}, {
  timestamps: true,
  collection: 'gpcoachingsessions',
});

CoachingSessionSchema.index({ employeeId: 1, scheduledAt: -1 });
CoachingSessionSchema.index({ conductedBy: 1, scheduledAt: -1 });
CoachingSessionSchema.index({ status: 1, scheduledAt: 1 });
CoachingSessionSchema.index({ healthStatus: 1 });

if (mongoose.models.GpCoachingSession) {
  delete mongoose.models.GpCoachingSession;
}

export default mongoose.model<ICoachingSession>('GpCoachingSession', CoachingSessionSchema);
