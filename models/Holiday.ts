import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHoliday extends Document {
  orgId: mongoose.Types.ObjectId;
  name: string;
  date: string; // YYYY-MM-DD
  year: number;
  type: 'national' | 'regional' | 'optional' | 'restricted';
  description?: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    year: { type: Number, required: true },
    type: {
      type: String,
      enum: ['national', 'regional', 'optional', 'restricted'],
      default: 'national',
    },
    description: { type: String, trim: true, maxlength: 300 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Unique holiday per org per date
HolidaySchema.index({ orgId: 1, date: 1 }, { unique: true });
HolidaySchema.index({ orgId: 1, year: 1 });

const Holiday: Model<IHoliday> =
  mongoose.models.Holiday ||
  mongoose.model<IHoliday>('Holiday', HolidaySchema);

export default Holiday;
