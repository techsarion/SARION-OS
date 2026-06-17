import Link from 'next/link';
import { Users, Pencil, Plus } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getTeams } from '@/lib/server/data/org';
import { deleteTeam } from '@/lib/actions/teams';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/states';
import { DeleteButton } from '@/components/org/delete-button';

export const metadata = { title: 'Teams — Sarion Team OS' };

export default async function TeamsPage() {
  const user = await requirePermission('team:read');
  const teams = await getTeams();
  const canCreate = can(user.role, 'team:create');
  const canEdit = can(user.role, 'team:update');

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader
        title="Teams"
        subtitle="Cross-functional and department teams, their leads, and size."
        action={canCreate ? { href: '/teams/new', label: 'New team' } : undefined}
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams created yet"
          description="Teams group people within a department. Create your first team to start organising work."
          action={canCreate ? (
            <Link href="/teams/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              <Plus className="h-4 w-4" /> Create your first team
            </Link>
          ) : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border text-left text-caption text-text-muted">
                <th className="px-4 py-2.5 font-medium">Team</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Lead</th>
                <th className="px-4 py-2.5 font-medium">Members</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{t.name}</p>
                    {t.description && <p className="truncate text-caption text-text-muted">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{t.departmentName ?? '—'}</td>
                  <td className="px-4 py-3">
                    {t.leadName ? (
                      <span className="inline-flex items-center gap-2"><Avatar name={t.leadName} size={22} /> <span className="text-text-secondary">{t.leadName}</span></span>
                    ) : (
                      <Badge tone="outline">Unassigned</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">{t.memberCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Link href={`/teams/${t.id}/edit`} className="grid h-7 w-7 place-items-center rounded-sm text-text-muted hover:bg-white/[0.05] hover:text-text" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      )}
                      {canEdit && (
                        <DeleteButton id={t.id} action={deleteTeam} label="Delete team" confirmText={`Delete the “${t.name}” team? This cannot be undone.`} />
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
