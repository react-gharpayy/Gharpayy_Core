import mongoose, { Schema, Document } from 'mongoose';

export interface INotice extends Document {
  title: string;
  message: string;
  type: 'general' | 'warning' | 'urgent';
  targetId: string | null; // null = all employees
  targetName: string | null;
  createdBy: string;
  createdByName: string;
  readBy: string[];
  createdAt: Date;
}

const NoticeSchema = new Schema<INotice>({
  title:         { type: String, required: true, trim: true },
  message:       { type: String, required: true, trim: true },
  type:          { type: String, enum: ['general', 'warning', 'urgent'], default: 'general' },
  targetId:      { type: String, default: null },
  targetName:    { type: String, default: null },
  createdBy:     { type: String, required: true },
  createdByName: { type: String, required: true },
  readBy:        { type: [String], default: [] },
}, { timestamps: true });

NoticeSchema.index({ targetId: 1, createdAt: -1 });

export default mongoose.models.GpNotice || mongoose.model<INotice>('GpNotice', NoticeSchema);