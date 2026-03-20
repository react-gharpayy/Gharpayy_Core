import mongoose, { Schema, Document } from 'mongoose';

export interface IOfficeZone extends Document {
  name: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  createdAt: Date;
}

const OfficeZoneSchema = new Schema<IOfficeZone>({
  name: { type: String, required: true, trim: true },
  latitude: { type: Number },
  longitude: { type: Number },
  radiusMeters: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.GpOfficeZone || mongoose.model<IOfficeZone>('GpOfficeZone', OfficeZoneSchema);
