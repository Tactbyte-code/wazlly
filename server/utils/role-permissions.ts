/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { PERMISSIONS, PermissionMap } from "@shared/schema";
import { Role } from "@shared/roles";

export function resolveUserPermissions(
  role: string,
  dbPermissions?: string[]
): PermissionMap {
  if (role === Role.ADMIN || role === Role.SUPERADMIN) {
    // Admin gets all permissions dynamically from PERMISSIONS
    const all: PermissionMap = {};
    Object.values(PERMISSIONS).forEach((perm) => {
      all[perm] = true;
    });
    return all;
  }

  // For other roles → convert DB array to PermissionMap
  if (!dbPermissions || dbPermissions.length === 0) {
    return {};
  }

  return dbPermissions.reduce((acc, perm) => {
    acc[perm] = true;
    return acc;
  }, {} as PermissionMap);
}
