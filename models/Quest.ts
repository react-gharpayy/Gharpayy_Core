import mongoose, { Schema, Document } from 'mongoose';

export interface IQuest extends Document {
  questId: string;
  title: string;
  description: string;
  kind: string; // 'daily' | 'weekly' | 'seasonal'
  target: number;
  metric: string;
  xpAward: number;
  coinAward: number;
  active: boolean;
  isCustom?: boolean;
}

const questSchema = new Schema<IQuest>({
  questId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  kind: { type: String, required: true, enum: ['daily', 'weekly', 'seasonal'] },
  target: { type: Number, required: true },
  metric: { type: String, required: true },
  xpAward: { type: Number, required: true },
  coinAward: { type: Number, required: true },
  active: { type: Boolean, default: true },
  isCustom: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default mongoose.models.Quest || mongoose.model<IQuest>('Quest', questSchema);
