// RBAC permission catalog + ability factory (ported from the former @sarion/rbac package).
// Used by Server Actions/middleware (server) and UI gating (client). Server stays authoritative.
import { Role } from '@/types/enums';

export const PERMISSIONS = [
  'user:read', 'user:create', 'user:update', 'user:remove', 'user:status',
  'dept:read', 'dept:create', 'dept:update', 'dept:remove',
  'team:read', 'team:create', 'team:update',
  'permission:grant',
  'analytics:company', 'audit:read', 'security:config',
  'task:read', 'task:create', 'task:assign', 'task:transition', 'task:delete',
  'project:read', 'project:create', 'project:assign',
  'meeting:read', 'meeting:create', 'meeting:conduct', 'meeting:minute', 'meeting:close',
  'approval:create', 'approval:decide', 'approval:configure',
  'goal:read', 'goal:create', 'goal:update',
  'document:read', 'document:create', 'document:version',
  'automation:manage', 'ai:use', 'ai:exec',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, Permission[] | '*'> = {
  [Role.SUPER_ADMIN]: '*',
  [Role.MANAGING_DIRECTOR]: [
    'user:read', 'dept:read', 'team:read', 'team:create', 'analytics:company', 'audit:read',
    'task:read', 'task:create', 'task:assign', 'task:transition',
    'project:read', 'project:create', 'project:assign',
    'meeting:read', 'meeting:create', 'meeting:conduct', 'meeting:minute', 'meeting:close',
    'approval:create', 'approval:decide', 'approval:configure',
    'goal:read', 'goal:create', 'goal:update',
    'document:read', 'document:create', 'document:version',
    'automation:manage', 'ai:use', 'ai:exec',
  ],
  [Role.DEPARTMENT_HEAD]: [
    'user:read', 'user:create', 'user:status', 'dept:read', 'team:read', 'team:create',
    'task:read', 'task:create', 'task:assign', 'task:transition',
    'project:read', 'project:create', 'project:assign',
    'meeting:read', 'meeting:create', 'meeting:conduct', 'meeting:minute', 'meeting:close',
    'approval:create', 'approval:decide',
    'goal:read', 'goal:create', 'goal:update',
    'document:read', 'document:create', 'document:version',
    'automation:manage', 'ai:use',
  ],
  [Role.TEAM_LEAD]: [
    'user:read', 'dept:read', 'team:read',
    'task:read', 'task:create', 'task:assign', 'task:transition',
    'project:read',
    'meeting:read', 'meeting:create', 'meeting:conduct',
    'approval:create', 'goal:read', 'goal:create', 'goal:update',
    'document:read', 'document:create', 'document:version', 'ai:use',
  ],
  [Role.MARKETING_OFFICER]: [
    'user:read', 'dept:read', 'team:read',
    'task:read', 'task:create', 'task:assign', 'task:transition',
    'project:read', 'project:create',
    'meeting:read', 'meeting:create',
    'approval:create',
    'goal:read', 'goal:create', 'goal:update',
    'document:read', 'document:create', 'document:version', 'ai:use',
  ],
  [Role.EMPLOYEE]: [
    'user:read', 'dept:read', 'team:read',
    'task:read', 'task:transition', 'project:read', 'meeting:read',
    'approval:create', 'goal:read', 'document:read', 'document:create', 'ai:use',
  ],
  [Role.GUEST]: ['user:read', 'dept:read', 'team:read', 'task:read', 'project:read', 'meeting:read', 'goal:read', 'document:read'],
};

export function can(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms === '*' || perms.includes(permission);
}
