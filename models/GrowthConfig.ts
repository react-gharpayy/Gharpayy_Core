import mongoose, { Schema, Document } from 'mongoose';

export interface IGrowthConfig extends Document {
  questsEnabled: boolean;
  rewardsEnabled: boolean;
  leaderboardEnabled: boolean;
  economyFrozen: boolean;
  globalMultiplier: number; // e.g., 1.5x for special events
}

const configSchema = new Schema<IGrowthConfig>({
  questsEnabled: { type: Boolean, default: true },
  rewardsEnabled: { type: Boolean, default: true },
  leaderboardEnabled: { type: Boolean, default: true },
  economyFrozen: { type: Boolean, default: false },
  globalMultiplier: { type: Number, default: 1.0 }
}, {
  timestamps: true
});

export default mongoose.models.GrowthConfig || mongoose.model<IGrowthConfig>('GrowthConfig', configSchema);
