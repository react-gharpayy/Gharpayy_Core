import mongoose, { Schema, Document } from 'mongoose';

export interface IReward extends Document {
  rewardId: string;
  title: string;
  description: string;
  category: string;
  rarity: string;
  coinCost: number;
  approvalRequired: boolean;
  cooldownDays: number;
  stockLimit?: number;
  active: boolean;
  image?: string;
  isCustom?: boolean;
}

const rewardSchema = new Schema<IReward>({
  rewardId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  rarity: { type: String, required: true },
  coinCost: { type: Number, required: true },
  approvalRequired: { type: Boolean, default: false },
  cooldownDays: { type: Number, default: 0 },
  stockLimit: { type: Number },
  active: { type: Boolean, default: true },
  image: { type: String },
  isCustom: { type: Boolean, default: true } // Used to differentiate DB-only rewards from hardcoded defaults
}, {
  timestamps: true
});

export default mongoose.models.Reward || mongoose.model<IReward>('Reward', rewardSchema);
