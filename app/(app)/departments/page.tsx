import Link from 'next/link';
import { Building2, Pencil, Plus } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getDepartments } from '@/lib/server/data/org';
import { deleteDepartment } from '@/lib/actions/departments';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/states';
import { DeleteButton } from '@/components/org/delete-button';

export const metadata = { title: 'Departments — Sarion Team OS' };

export default async function DepartmentsPage() {
  const user = await requirePermission('dept:read');
  const departments = await getDepartments();
  const canCreate = can(user.role, 'dept:create');
  const canEdit = can(user.role, 'dept:update');
  const canDelete = can(user.role, 'dept:remove');

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader
        title="Departments"
        subtitle="Organisational units, their heads, teams, and headcount."
        action={canCreate ? { href: '/departments/new', label: 'New department' } : undefined}
      />

      {departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments created yet"
          description="Departments are the top level of your org structure. Create your first one to start grouping teams and people."
          action={canCreate ? (
            <Link href="/departments/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              <Plus className="h-4 w-4" /> Create your first department
            </Link>
          ) : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border text-left text-caption text-text-muted">
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Head</th>
                <th className="px-4 py-2.5 font-medium">Teams</th>
                <th className="px-4 py-2.5 font-medium">Members</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{d.name}</p>
                    {d.description && <p className="truncate text-caption text-text-muted">{d.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {d.headName ? (
                      <span className="inline-flex items-center gap-2"><Avatar name={d.headName} size={22} /> <span className="text-text-secondary">{d.headName}</span></span>
                    ) : (
                      <Badge tone="outline">Unassigned</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">{d.teamCount}</td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">{d.memberCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Link href={`/departments/${d.id}/edit`} className="grid h-7 w-7 place-items-center rounded-sm text-text-muted hover:bg-white/[0.05] hover:text-text" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      )}
                      {canDelete && (
                        <DeleteButton id={d.id} action={deleteDepartment} label="Delete department" confirmText={`Delete “${d.name}”? This can be restored by an admin.`} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
