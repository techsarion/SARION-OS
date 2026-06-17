import { getCurrentUser } from '@/lib/auth';
import { dashboardFor } from '@/lib/roles';
import { getDashboardMetrics } from '@/lib/server/data/dashboard';
import { OwnerDashboard } from '@/components/dashboard/owner-dashboard';
import { ManagingDirectorDashboard } from '@/components/dashboard/md-dashboard';
import { DepartmentDashboard } from '@/components/dashboard/department-dashboard';
import { EmployeeDashboard } from '@/components/dashboard/employee-dashboard';

/**
 * Role-aware dashboard. Each of the four roles lands on a tailored experience
 * (see lib/roles.ts → dashboardFor), all fed by the same real metrics.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const kind = user ? dashboardFor(user.role) : 'employee';
  const metrics = await getDashboardMetrics(user?.id ?? '');

  switch (kind) {
    case 'owner':
      return <OwnerDashboard firstName={firstName} metrics={metrics} />;
    case 'managing-director':
      return <ManagingDirectorDashboard firstName={firstName} metrics={metrics} />;
    case 'department':
      return <DepartmentDashboard firstName={firstName} metrics={metrics} />;
    default:
      return <EmployeeDashboard firstName={firstName} metrics={metrics} />;
  }
}
