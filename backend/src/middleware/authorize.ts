import { Request, Response, NextFunction } from 'express';
import { Role } from '../generated/prisma/client';
import { hasMinRole, Permission, hasPermission } from '../shared/constants/roles';
import { ApiError } from '../shared/utils/apiError';
import { prisma } from '../config/database';

const activeStatusCache = new Map<string, { isActive: boolean; cachedAt: number }>();
const CACHE_TTL = 60_000; // 60 seconds

async function isUserActive(userId: string): Promise<boolean> {
  const cached = activeStatusCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.isActive;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, deletedAt: true },
  });

  const isActive = user ? user.isActive && !user.deletedAt : false;
  activeStatusCache.set(userId, { isActive, cachedAt: Date.now() });
  return isActive;
}

export function clearActiveStatusCache(userId?: string) {
  if (userId) {
    activeStatusCache.delete(userId);
  } else {
    activeStatusCache.clear();
  }
}

export function authorize(...requiredRoles: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const active = await isUserActive(req.user.userId);
    if (!active) {
      throw ApiError.forbidden('Account is deactivated');
    }

    if (requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => hasMinRole(req.user!.role, role));
      if (!hasRole) {
        throw ApiError.forbidden('Insufficient permissions for this action');
      }
    }

    next();
  };
}

export function requirePermission(...permissions: Permission[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const active = await isUserActive(req.user.userId);
    if (!active) {
      throw ApiError.forbidden('Account is deactivated');
    }

    const hasAll = permissions.every((perm) => hasPermission(req.user!.role, perm));
    if (!hasAll) {
      throw ApiError.forbidden('Insufficient permissions for this action');
    }

    next();
  };
}
