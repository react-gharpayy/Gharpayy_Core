/**
 * components/hierarchy/types.ts
 *
 * Shared TypeScript interfaces for the hierarchy UI layer.
 * Mirrors the shape returned by /api/org and /api/hierarchy/* endpoints.
 */

export interface HierarchyRoleMeta {
  _id?: string;
  name: string;
  color: string;
  level?: number;
}

/** A member inside a group (employee or team lead) */
export interface HierarchyMember {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  systemRole: string;
  hierarchyRole: HierarchyRoleMeta | null;
  teamName: string;
  department: string;
  team: string;
  jobRole: string;
  isApproved: boolean;
  managerId: string | null;
  managerName: string | null;
}

/** A top-level group in the tree (manager node or zone node) */
export interface HierarchyGroup {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  systemRole: string;
  hierarchyRole: HierarchyRoleMeta | null;
  team: string;
  groupType: 'manager' | 'zone';
  reports: HierarchyMember[];
}

/** An available manager for the "Reports To" dropdown */
export interface AvailableManager {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  systemRole: string;
  hierarchyRole: { name: string; color: string } | null;
}

/** Full response shape from GET /api/org */
export interface OrgApiResponse {
  ok: boolean;
  tree: HierarchyGroup[];
  unassigned: HierarchyMember[];
  total: number;
  groupedByZone: boolean;
  availableManagers: AvailableManager[];
}

/** A configurable hierarchy role definition from /api/hierarchy/roles */
export interface HierarchyRoleDef {
  _id: string;
  name: string;
  slug: string;
  systemRole: string;
  level: number;
  color: string;
  canManageTeam: boolean;
  canBeReportedTo: boolean;
}

/** Edit form state for assigning manager/team/department */
export interface OrgEditState {
  managerId: string;
  teamName: string;
  department: string;
}

/** Edit form state for assigning hierarchy role */
export interface HierarchyAssignState {
  hierarchyRoleId: string;
  managerId: string;
}
