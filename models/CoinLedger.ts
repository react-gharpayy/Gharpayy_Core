import mongoose, { Schema, Document } from 'mongoose';

export interface ICoinLedger extends Document {
  userId: mongoose.Types.ObjectId;
  delta: number;
  reason: string;
  relatedEventId?: mongoose.Types.ObjectId;
  ts: Date;
}

const CoinLedgerSchema = new Schema<ICoinLedger>({
  userId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  delta: { type: Number, required: true },
  reason: { type: String, required: true },
  relatedEventId: { type: Schema.Types.ObjectId, ref: 'GrowthEvent' },
  ts: { type: Date, default: Date.now },
}, { 
  collection: 'gp_coin_ledger'
});

CoinLedgerSchema.index({ userId: 1, ts: -1 });

export default mongoose.models?.CoinLedger || mongoose.model<ICoinLedger>('CoinLedger', CoinLedgerSchema);
