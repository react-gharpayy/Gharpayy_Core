import type { AuthPayload } from '@/types';

/**
 * role-guards.ts
 * Centralized role-check helpers for the sub_admin feature.
 * Import these in API routes to keep role logic consistent.
 * DO NOT modify existing auth logic - only ADD new checks here.
 */

/** Returns true if the user is a full admin */
export function isAdmin(user: AuthPayload): boolean {
  return user.role === 'admin';
}

/** Returns true if the user has elevated access (admin or manager) */
export function isElevated(user: AuthPayload): boolean {
  return ['admin', 'manager'].includes(user.role);
}

export function isSubAdmin(user: AuthPayload): boolean {
  return user.role === 'sub_admin';
}

/**
 * Builds a MongoDB employee filter scoped to the caller's role.
 *
 * - admin             => returns base filter (sees everyone)
 * - manager           => adds managerId constraint (team only)
 * - employee          => returns null (not allowed to query employees)
 *
 * @param user   Decoded JWT payload
 * @param base   Any extra filter conditions to merge in
 * @returns A filter object or null if the caller is not permitted
 */
export function buildEmployeeFilter(
  user: AuthPayload,
  base: Record<string, unknown> = {}
): Record<string, unknown> | null {
  if (user.role === 'employee') return null;

  // admin - unrestricted visibility
  if (user.role === 'admin') {
    return base;
  }

  // manager - restricted to their team
  if (user.role === 'manager') {
    return { ...base, managerId: user.id };
  }

  return base;
}

/**
 * Verifies that a given employee can be accessed by the user.
 * Always returns true for admin.
 */
export function canAccessEmployee(
  user: AuthPayload,
  employeeId: string | null | undefined
): boolean {
  if (user.role === 'admin') return true;
  return false; // For other roles, access should be verified by queries using managerId
}
