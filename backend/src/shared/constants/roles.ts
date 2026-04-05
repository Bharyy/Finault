import { Role } from '../../generated/prisma/client';

export const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 1,
  ANALYST: 2,
  ADMIN: 3,
};

export type Permission =
  | 'transactions:read'
  | 'transactions:create'
  | 'transactions:update'
  | 'transactions:delete'
  | 'dashboard:read'
  | 'dashboard:trends'
  | 'dashboard:anomalies'
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'anomalies:read'
  | 'anomalies:resolve'
  | 'sms-ledger:read';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  VIEWER: [
    'transactions:read',
    'dashboard:read',
  ],
  ANALYST: [
    'transactions:read',
    'dashboard:read',
    'dashboard:trends',
    'dashboard:anomalies',
    'anomalies:read',
  ],
  ADMIN: [
    'transactions:read',
    'transactions:create',
    'transactions:update',
    'transactions:delete',
    'dashboard:read',
    'dashboard:trends',
    'dashboard:anomalies',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'anomalies:read',
    'anomalies:resolve',
    'sms-ledger:read',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
