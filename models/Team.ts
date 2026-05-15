/**
 * models/Team.ts
 *
 * Represents a named team within the organization.
 * Teams are owned by a manager/team lead and contain members.
 * Supports nested teams via parentTeamId for org hierarchy.
 *
 * This model is intentionally lightweight — the primary reporting
 * relationship lives on User.managerId. Teams are for grouping/display.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  /** Display name, e.g. "Backend Engineering" */
  name: string;
  /** URL-safe identifier */
  slug: string;
  /** Optional description */
  description?: string;
  /** The manager/lead who owns this team */
  managerId: mongoose.Types.ObjectId;
  /** Optional parent team for nested hierarchy */
  parentTeamId?: mongoose.Types.ObjectId | null;
  /** Department this team belongs to */
  department?: string;
  /** Badge color for UI */
  color: string;
  /** Whether this team is active */
  isActive: boolean;
}

const TeamSchema = new Schema<ITeam>(
  {
    name:         { type: String, required: true, trim: true },
    slug:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    description:  { type: String },
    managerId:    { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
    parentTeamId: { type: Schema.Types.ObjectId, ref: 'GpTeam', default: null },
    department:   { type: String, default: '' },
    color:        { type: String, default: '#6366f1' },
    isActive:     { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'gp_teams',
  }
);

TeamSchema.index({ managerId: 1, isActive: 1 });
TeamSchema.index({ parentTeamId: 1 });

export default mongoose.models?.GpTeam ||
  mongoose.model<ITeam>('GpTeam', TeamSchema);
