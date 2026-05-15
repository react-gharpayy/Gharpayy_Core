import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestProgress extends Document {
  userId: mongoose.Types.ObjectId;
  questId: string;
  count: number;
  claimed: boolean;
  periodKey: string; // YYYY-MM-DD or YYYY-Wn
  updatedAt: Date;
}

const QuestProgressSchema = new Schema<IQuestProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  questId: { type: String, required: true },
  count: { type: Number, default: 0 },
  claimed: { type: Boolean, default: false },
  periodKey: { type: String, required: true },
}, { 
  timestamps: { createdAt: false, updatedAt: true },
  collection: 'gp_quest_progress'
});

// Compound index for uniqueness per user, quest, and period
QuestProgressSchema.index({ userId: 1, questId: 1, periodKey: 1 }, { unique: true });

export default mongoose.models?.QuestProgress || mongoose.model<IQuestProgress>('QuestProgress', QuestProgressSchema);
