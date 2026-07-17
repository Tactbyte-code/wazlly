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

import type { Request, Response, NextFunction } from 'express';
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { storage } from '../storage';
import { Role } from '@shared/roles';

export async function resolveTenantChannels(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req.session as any)?.user || (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (user.role === Role.SUPERADMIN) {
      (req as any).isSuperAdmin = true;
      (req as any).tenantChannelIds = null;
      return next();
    }

    const ownerId = user.role === Role.TEAM ? user.createdBy : user.id;
    
    if (!ownerId) {
      (req as any).isSuperAdmin = false;
      (req as any).tenantChannelIds = [];
      return next();
    }

    const channels = await storage.getChannelsByUserId(ownerId);
    const channelIds = channels.map((ch: any) => ch.id);

    (req as any).isSuperAdmin = false;
    (req as any).tenantChannelIds = channelIds;
    next();
  } catch (error) {
    next(error);
  }
}

export function verifyChannelOwnership(
  req: Request,
  channelId: string
): boolean {
  if ((req as any).isSuperAdmin) return true;
  const tenantChannelIds: string[] = (req as any).tenantChannelIds || [];
  return tenantChannelIds.includes(channelId);
}
