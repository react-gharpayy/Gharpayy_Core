import mongoose, { Schema, Document } from 'mongoose';

export interface IGrowthEvent extends Document {
  userId: mongoose.Types.ObjectId;
  event: string;
  xpAwarded: number;
  note?: string;
  sourceId: string; // For idempotency
  sourceType: string; // e.g., 'task', 'attendance', 'kudo'
  ts: Date;
}

const GrowthEventSchema = new Schema<IGrowthEvent>({
  userId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  event: { type: String, required: true },
  xpAwarded: { type: Number, required: true },
  note: { type: String },
  sourceId: { type: String, required: true },
  sourceType: { type: String, required: true },
  ts: { type: Date, default: Date.now },
}, { 
  collection: 'gp_growth_events'
});

// Compound index for idempotency
GrowthEventSchema.index({ sourceId: 1, event: 1 }, { unique: true });
GrowthEventSchema.index({ userId: 1, ts: -1 });

export default mongoose.models?.GrowthEvent || mongoose.model<IGrowthEvent>('GrowthEvent', GrowthEventSchema);
