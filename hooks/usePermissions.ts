/**
 * hooks/usePermissions.ts
 *
 * React hook for permission-based UI rendering.
 * Fetches the current user's permissions once and caches them.
 *
 * @example
 * const { can, loading } = usePermissions();
 *
 * if (can('VIEW_TEAM_REPORTS')) {
 *   // render team reports section
 * }
 *
 * if (can('HOST_ONE_ON_ONE')) {
 *   // render 1:1 session button
 * }
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

type Permission = string;

interface PermissionsState {
  permissions: Permission[];
  role: string;
  systemRole: string;
  hierarchyLevel: number;
  loading: boolean;
  error: string | null;
}

const DEFAULT_STATE: PermissionsState = {
  permissions: [],
  role: '',
  systemRole: '',
  hierarchyLevel: 99,
  loading: true,
  error: null,
};

// Module-level cache so multiple components share one fetch
let cachedPermissions: PermissionsState | null = null;
let fetchPromise: Promise<void> | null = null;

export function usePermissions() {
  const [state, setState] = useState<PermissionsState>(
    cachedPermissions ?? DEFAULT_STATE
  );

  useEffect(() => {
    if (cachedPermissions) {
      setState(cachedPermissions);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetch('/api/auth/permissions')
        .then(r => r.json())
        .then(data => {
          const next: PermissionsState = {
            permissions: data.permissions ?? [],
            role: data.role ?? '',
            systemRole: data.systemRole ?? '',
            hierarchyLevel: data.hierarchyLevel ?? 99,
            loading: false,
            error: null,
          };
          cachedPermissions = next;
          setState(next);
        })
        .catch(err => {
          const next: PermissionsState = {
            ...DEFAULT_STATE,
            loading: false,
            error: err.message ?? 'Failed to load permissions',
          };
          setState(next);
          fetchPromise = null; // allow retry on error
        });
    } else {
      fetchPromise.then(() => {
        if (cachedPermissions) setState(cachedPermissions);
      });
    }
  }, []);

  /**
   * Returns true if the current user has the given permission.
   */
  const can = useCallback(
    (permission: Permission): boolean => {
      return state.permissions.includes(permission);
    },
    [state.permissions]
  );

  /**
   * Returns true if the current user has ANY of the given permissions.
   */
  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.some(p => state.permissions.includes(p));
    },
    [state.permissions]
  );

  /**
   * Returns true if the current user has ALL of the given permissions.
   */
  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.every(p => state.permissions.includes(p));
    },
    [state.permissions]
  );

  /**
   * Clears the permission cache (call on logout).
   */
  const clearCache = useCallback(() => {
    cachedPermissions = null;
    fetchPromise = null;
    setState(DEFAULT_STATE);
  }, []);

  return {
    ...state,
    can,
    canAny,
    canAll,
    clearCache,
    isAdmin: state.systemRole === 'admin' || state.role === 'admin',
    isManager: state.hierarchyLevel <= 1,
    isTeamLead: state.hierarchyLevel <= 2,
  };
}
