import Link from 'next/link';
import { GitBranch, UserPlus, UserRoundPlus } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getEmployees, getDepartments } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { EmployeeDirectory } from '@/components/people/employee-directory';

export const metadata = { title: 'Employees — Sarion Team OS' };

export default async function EmployeesPage() {
  const user = await requirePermission('user:read');
  const [employees, departments] = await Promise.all([getEmployees(), getDepartments()]);
  const canInvite = can(user.role, 'user:create');

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title="Employee directory" subtitle="Everyone in the organisation, searchable by team, role, and status.">
        <Link href="/employees/hierarchy" className={buttonVariants({ variant: 'secondary', size: 'md' })}>
          <GitBranch className="h-4 w-4" /> Hierarchy
        </Link>
        {canInvite && (
          <Link href="/employees/invite" className={buttonVariants({ variant: 'secondary', size: 'md' })}>
            <UserPlus className="h-4 w-4" /> Invite
          </Link>
        )}
        {canInvite && (
          <Link href="/employees/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            <UserRoundPlus className="h-4 w-4" /> Create account
          </Link>
        )}
      </PageHeader>

      <EmployeeDirectory employees={employees} departments={departments.map((d) => ({ id: d.id, name: d.name }))} />
    </div>
  );
}
