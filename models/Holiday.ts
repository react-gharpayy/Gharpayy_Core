import mongoose, { Schema, Document } from 'mongoose';

export interface IHoliday extends Document {
  name: string;
  date: string; // YYYY-MM-DD IST
  type: 'public' | 'optional';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>({
  name:        { type: String, required: true, trim: true },
  date:        { type: String, required: true },
  type:        { type: String, enum: ['public','optional'], default: 'public' },
  description: { type: String, default: '' },
}, { timestamps: true });

HolidaySchema.index({ date: 1 }, { unique: true });

export default mongoose.models.GpHoliday || mongoose.model<IHoliday>('GpHoliday', HolidaySchema);
