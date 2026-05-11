/**
 * lib/role-guards.ts
 *
 * Backward-compatible role guard helpers.
 * These functions are kept for existing code that imports them.
 * New code should use lib/permissions.ts directly.
 *
 * @deprecated Use canAccess(), buildScopedEmployeeFilter(), etc. from lib/permissions.ts
 */

import type { AuthPayload } from '@/types';
import {
  isAdmin as _isAdmin,
  isElevated as _isElevated,
  buildScopedEmployeeFilter,
  canAccessEmployeeData,
} from '@/lib/permissions';

/** Returns true if the user is a full admin */
export function isAdmin(user: AuthPayload): boolean {
  return _isAdmin(user);
}

/** Returns true if the user has elevated access (admin or manager) */
export function isElevated(user: AuthPayload): boolean {
  return _isElevated(user);
}

/** @deprecated sub_admin is now mapped to manager via systemRole */
export function isSubAdmin(user: AuthPayload): boolean {
  return user.role === 'sub_admin';
}

/**
 * Builds a MongoDB employee filter scoped to the caller's role.
 * Delegates to the new permission system.
 *
 * @deprecated Use buildScopedEmployeeFilter from lib/permissions.ts
 */
export function buildEmployeeFilter(
  user: AuthPayload,
  base: Record<string, unknown> = {}
): Record<string, unknown> | null {
  return buildScopedEmployeeFilter(user, base);
}

/**
 * Verifies that a given employee can be accessed by the user.
 *
 * @deprecated Use canAccessEmployeeData from lib/permissions.ts
 */
export function canAccessEmployee(
  user: AuthPayload,
  employeeId: string | null | undefined,
  employeeManagerId?: string | null
): boolean {
  if (!employeeId) return false;
  return canAccessEmployeeData(user, employeeId, employeeManagerId);
}
