// Role presentation + dashboard routing helpers. Maps the 6 RBAC roles
// (types/enums.ts) onto human labels and the 4 dashboard experiences the
// product defines: Owner, Managing Director, Department, Employee.
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

/** The four dashboard experiences. */
export type DashboardKind = 'owner' | 'managing-director' | 'department' | 'employee';

/**
 * Which dashboard a role lands on. Owner = company-wide; MD = cross-department;
 * Department Heads & Team Leads share the department view; everyone else gets
 * the personal employee dashboard.
 */
export function dashboardFor(role: Role): DashboardKind {
  switch (role) {
    case Role.SUPER_ADMIN:
      return 'owner';
    case Role.MANAGING_DIRECTOR:
      return 'managing-director';
    case Role.DEPARTMENT_HEAD:
    case Role.TEAM_LEAD:
    case Role.MARKETING_OFFICER:
      return 'department';
    default:
      return 'employee';
  }
}
