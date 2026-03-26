import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordChangeRequest extends Document {
  userId: mongoose.Types.ObjectId;
  newPasswordHash: string;
  status: 'pending' | 'approved' | 'rejected';
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordChangeRequestSchema = new Schema<IPasswordChangeRequest>({
  userId:          { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  newPasswordHash:{ type: String, required: true },
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  expiresAt:      { type: Date, default: null },
}, { timestamps: true });

PasswordChangeRequestSchema.index({ userId: 1, status: 1 });
PasswordChangeRequestSchema.index({ expiresAt: 1 });

export default mongoose.models.GpPasswordChangeRequest
  || mongoose.model<IPasswordChangeRequest>('GpPasswordChangeRequest', PasswordChangeRequestSchema);

