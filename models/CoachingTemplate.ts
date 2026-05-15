import mongoose, { Schema, Document } from 'mongoose';

export interface ICoachingTemplate extends Document {
  name: string;
  description?: string;
  agendaItems: string[];
  discussionPrompts: string[];
  createdBy: string;
  createdByName: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CoachingTemplateSchema = new Schema<ICoachingTemplate>({
  name:               { type: String, required: true, trim: true },
  description:        { type: String, default: '' },
  agendaItems:        { type: [String], default: [] },
  discussionPrompts:  { type: [String], default: [] },
  createdBy:          { type: String, required: true },
  createdByName:      { type: String, required: true },
  isDefault:          { type: Boolean, default: false },
}, {
  timestamps: true,
  collection: 'gpcoachingtemplates',
});

CoachingTemplateSchema.index({ isDefault: 1 });

export default mongoose.models?.GpCoachingTemplate
  || mongoose.model<ICoachingTemplate>('GpCoachingTemplate', CoachingTemplateSchema);
