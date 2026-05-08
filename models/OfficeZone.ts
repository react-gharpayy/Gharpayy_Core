import mongoose, { Schema, Document } from 'mongoose';

export interface IOfficeZone extends Document {
  name: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  weekOffDay?: string;
  shiftStart?: string;
  shiftEnd?: string;
  graceMinutes?: number;
  earlyGraceMinutes?: number;
  createdAt: Date;
}

const OfficeZoneSchema = new Schema<IOfficeZone>({
  name:         { type: String, required: true, trim: true },
  latitude:     { type: Number },
  longitude:    { type: Number },
  radiusMeters: { type: Number },
  weekOffDay:   { type: String, default: 'Tuesday' },
  shiftStart:   { type: String, default: '10:00' },
  shiftEnd:     { type: String, default: '19:00' },
  graceMinutes: { type: Number, default: 15 },
  earlyGraceMinutes: { type: Number, default: 0 },
}, { 
  timestamps: true,
  collection: 'gpofficezones'
});

export default mongoose.models?.GpOfficeZone || mongoose.model<IOfficeZone>('GpOfficeZone', OfficeZoneSchema);
