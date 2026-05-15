/**
 * GET /api/auth/permissions
 *
 * Returns the full permission set for the currently authenticated user.
 * Frontend uses this to conditionally render UI elements without
 * hardcoding role checks in components.
 *
 * Response:
 *   permissions: string[]   - list of permission keys the user has
 *   role: string            - legacy role
 *   systemRole: string      - effective permission tier
 *   hierarchyLevel: number  - numeric level (0=admin, 4=employee)
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserPermissions, getHierarchyLevel } from '@/lib/permissions';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = getUserPermissions(user);
    const hierarchyLevel = getHierarchyLevel(user.role, user.systemRole);
    const effectiveRole = user.systemRole || user.role;

    return NextResponse.json({
      permissions,
      role: user.role,
      systemRole: effectiveRole,
      hierarchyLevel,
    });
  } catch (e: unknown) {
    console.error('[auth/permissions GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
