/**
 * lib/permission-middleware.ts
 *
 * Reusable API route helpers that combine auth + permission checks.
 * Use these in API routes to replace scattered inline role checks.
 *
 * @example
 * // Before (scattered inline check):
 * const user = await getAuthUser();
 * if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *
 * // After (centralized):
 * const { user, error } = await requirePermission('VIEW_ALL_EMPLOYEES');
 * if (error) return error;
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { canAccess, canAccessAny, type Permission } from '@/lib/permissions';
import type { AuthPayload } from '@/types';

type GuardResult =
  | { user: AuthPayload; error: null }
  | { user: null; error: NextResponse };

/**
 * Requires the caller to be authenticated and have a specific permission.
 * Returns the user if authorized, or a ready-to-return error response.
 */
export async function requirePermission(permission: Permission): Promise<GuardResult> {
  const user = await getAuthUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!canAccess(user, permission)) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user, error: null };
}

/**
 * Requires the caller to be authenticated and have ANY of the given permissions.
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<GuardResult> {
  const user = await getAuthUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!canAccessAny(user, permissions)) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user, error: null };
}

/**
 * Requires the caller to be authenticated (any role).
 * Use for routes that just need a logged-in user.
 */
export async function requireAuth(): Promise<GuardResult> {
  const user = await getAuthUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { user, error: null };
}

/**
 * Requires the caller to be an admin.
 * Kept for backward compatibility with existing admin-only routes.
 */
export async function requireAdmin(): Promise<GuardResult> {
  return requirePermission('VIEW_ADMIN_PANEL');
}

/**
 * Requires the caller to be an admin or manager (elevated access).
 * Kept for backward compatibility.
 */
export async function requireElevated(): Promise<GuardResult> {
  return requireAnyPermission(['VIEW_TEAM_EMPLOYEES', 'VIEW_ALL_EMPLOYEES']);
}
