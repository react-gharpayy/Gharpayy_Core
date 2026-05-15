import mongoose, { Schema, Document } from 'mongoose';

export interface IGrowthProfile extends Document {
  userId: mongoose.Types.ObjectId;
  xp: number;
  level: number;
  coins: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const GrowthProfileSchema = new Schema<IGrowthProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true, unique: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  coins: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: '' },
}, { 
  timestamps: true,
  collection: 'gp_growth_profiles'
});

GrowthProfileSchema.index({ userId: 1 });

export default mongoose.models?.GrowthProfile || mongoose.model<IGrowthProfile>('GrowthProfile', GrowthProfileSchema);
