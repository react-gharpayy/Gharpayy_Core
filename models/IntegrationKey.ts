import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIntegrationKey extends Document {
  orgId: string;
  key: string;
  updatedAt?: Date;
  createdAt?: Date;
}

const IntegrationKeySchema = new Schema<IIntegrationKey>({
  // Keep as string to support static admin id ("admin") and normal ObjectId strings
  orgId: { type: String, required: true, unique: true },
  key: { type: String, required: true },
}, { timestamps: true });

// Ensure updated schema is used during dev/hot-reload
if (mongoose.models.GpIntegrationKey) {
  delete mongoose.models.GpIntegrationKey;
}

const IntegrationKey: Model<IIntegrationKey> =
  mongoose.model<IIntegrationKey>('GpIntegrationKey', IntegrationKeySchema);

export default IntegrationKey;
