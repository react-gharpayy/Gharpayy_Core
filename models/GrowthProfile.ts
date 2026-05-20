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

// NOTE: userId already has a unique index via `unique: true` on the field definition above.
// Do NOT add schema.index({ userId: 1 }) here — it creates a duplicate index and triggers a Mongoose warning.

export default mongoose.models?.GrowthProfile || mongoose.model<IGrowthProfile>('GrowthProfile', GrowthProfileSchema);
