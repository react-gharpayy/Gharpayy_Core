import mongoose, { Schema, Document } from 'mongoose';

export interface IRedemption extends Document {
  userId: mongoose.Types.ObjectId;
  itemId: string;
  cost: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  note?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  ts: Date;
}

const RedemptionSchema = new Schema<IRedemption>({
  userId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  itemId: { type: String, required: true },
  cost: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'fulfilled'], default: 'pending' },
  note: { type: String },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'GpAttUser' },
  ts: { type: Date, default: Date.now },
}, { 
  collection: 'gp_redemptions'
});

RedemptionSchema.index({ userId: 1, ts: -1 });
RedemptionSchema.index({ status: 1 });

export default mongoose.models?.Redemption || mongoose.model<IRedemption>('Redemption', RedemptionSchema);
