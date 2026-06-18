// Role presentation helpers. Maps RBAC roles (types/enums.ts) onto human labels
// for the UI. The team is small and all-admin, so there is a single shared
// dashboard — no per-role dashboard routing.
import { Role } from '@/types/enums';

/** Human-readable label shown in the UI (topbar, dashboards). */
export const ROLE_LABEL: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Owner',
  [Role.MANAGING_DIRECTOR]: 'Managing Director',
  [Role.DEPARTMENT_HEAD]: 'Department Head',
  [Role.TEAM_LEAD]: 'Team Lead',
  [Role.MARKETING_OFFICER]: 'Marketing Officer',
  [Role.EMPLOYEE]: 'Employee',
  [Role.GUEST]: 'Guest',
};

export function roleLabel(role: Role): string {
  return ROLE_LABEL[role] ?? 'Team Member';
}
