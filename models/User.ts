import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'employee';
  dateOfBirth?: string;
  jobRole?: 'full-time' | 'intern';
  profilePhoto?: string;
  officeZoneId?: mongoose.Types.ObjectId;
  isApproved?: boolean;
  // Team hierarchy fields
  managerId?: mongoose.Types.ObjectId;   // who this employee reports to
  teamName?: string;                      // e.g. "Tech Team", "Sales Team"
  department?: string;                    // e.g. "Engineering", "Operations"
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  fullName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  role:         { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
  dateOfBirth:  { type: String },
  jobRole:      { type: String, enum: ['full-time', 'intern'] },
  profilePhoto: { type: String },
  officeZoneId: { type: Schema.Types.ObjectId, ref: 'GpOfficeZone' },
  isApproved:   { type: Boolean, default: false },
  // Hierarchy
  managerId:    { type: Schema.Types.ObjectId, ref: 'GpAttUser', default: null },
  teamName:     { type: String, default: '' },
  department:   { type: String, default: '' },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

export default mongoose.models.GpAttUser || mongoose.model<IUser>('GpAttUser', UserSchema);