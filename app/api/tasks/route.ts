import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  assignedTo: mongoose.Types.ObjectId;
  assignedToName: string;
  assignedBy: string;
  assignedByName: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'blocked' | 'pending_review' | 'completed' | 'overdue' | 'cancelled';
  teamId?: string;
  teamName?: string;
  completionNote?: string;
  completionPhoto?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  title:           { type: String, required: true, trim: true },
  description:     { type: String, default: '' },
  assignedTo:      { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  assignedToName:  { type: String, required: true },
  assignedBy:      { type: String, required: true },
  assignedByName:  { type: String, required: true },
  dueDate:         { type: String, default: null },
  priority:        { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status:          { type: String, enum: ['todo', 'in_progress', 'blocked', 'pending_review', 'completed', 'overdue', 'cancelled'], default: 'todo' },
  teamId:          { type: String, default: null },
  teamName:        { type: String, default: '' },
  completionNote:  { type: String, default: '' },
  completionPhoto: { type: String, default: null },
  completedAt:     { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.GpTask || mongoose.model<ITask>('GpTask', TaskSchema);