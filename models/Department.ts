/**
 * models/Department.ts
 *
 * Centralized department definitions.
 * Departments are org-wide groupings (Engineering, Sales, HR, etc.)
 * Teams belong to departments; employees belong to teams.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  slug: string;
  description?: string;
  color: string;
  isActive: boolean;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    color:       { type: String, default: '#6b7280' },
    isActive:    { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'gp_departments',
  }
);

DepartmentSchema.index({ isActive: 1, name: 1 });

export default mongoose.models?.GpDepartment ||
  mongoose.model<IDepartment>('GpDepartment', DepartmentSchema);
