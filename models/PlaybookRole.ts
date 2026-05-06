import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaybookRole extends Document {
  name: string;        // e.g. "Recruiter"
  slug: string;        // e.g. "recruiter"
  description?: string;
  color: string;       // e.g. "#f97316"
  isActive: boolean;
}

const PlaybookRoleSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  color: { type: String, default: '#f97316' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const PlaybookRole = mongoose.models.PlaybookRole || mongoose.model<IPlaybookRole>('PlaybookRole', PlaybookRoleSchema);
