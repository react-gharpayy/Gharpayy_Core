import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'employee';
  dateOfBirth?: string; // YYYY-MM-DD
  jobRole?: 'full-time' | 'intern';
  profilePhoto?: string; // base64 encoded
  officeZoneId?: mongoose.Types.ObjectId;
  isApproved?: boolean; // false until admin approves
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  fullName: { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
  dateOfBirth: { type: String },
  jobRole: { type: String, enum: ['full-time', 'intern'] },
  profilePhoto: { type: String }, // base64 string
  officeZoneId: { type: Schema.Types.ObjectId, ref: 'GpOfficeZone' },
  isApproved: { type: Boolean, default: false }, // employees need approval
  createdAt:{ type: Date, default: Date.now },
  updatedAt:{ type: Date, default: Date.now },
});

export default mongoose.models.GpAttUser || mongoose.model<IUser>('GpAttUser', UserSchema);
