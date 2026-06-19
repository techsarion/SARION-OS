import Link from 'next/link';
import { CheckSquare, Target, Users } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getDirectory } from '@/lib/server/data/people';
import { roleLabel } from '@/lib/roles';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Avatar } from '@/components/ui/misc';
import { can } from '@/lib/rbac';
import type { Role } from '@/types/enums';

export default async function DirectoryPage() {
  const user = await requireUser();
  const people = await getDirectory();
  const canInvite = can(user.role, 'user:create');

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title="Team Directory"
        subtitle="Who's who and what they're carrying"
        action={canInvite ? { href: '/employees/new', label: 'Add member' } : undefined}
      />
      {people.length === 0 ? (
        <EmptyState icon={Users} title="No team members yet" description="People appear here once they're added to the workspace." />
      ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {people.map((p) => (
          <Link
            key={p.id}
            href={`/employees/${p.id}`}
            className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4 transition-colors hover:border-accent/40"
          >
            <div className="flex items-center gap-3">
              <Avatar name={p.full_name} src={p.avatar_url} size={40} />
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium text-text">{p.full_name}</p>
                <p className="truncate text-caption text-text-muted">{p.designation ?? roleLabel(p.role as Role)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge tone="neutral">{roleLabel(p.role as Role)}</Badge>
              <Badge tone={p.status === 'ACTIVE' ? 'success' : 'warning'} dot>{p.status === 'ACTIVE' ? 'Active' : p.status}</Badge>
            </div>
            <p className="truncate text-caption text-text-muted">{p.email}</p>
            <div className="flex items-center gap-4 border-t border-border pt-2.5 text-caption text-text-secondary">
              <span className="inline-flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> {p.openTasks} tasks</span>
              <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> {p.activeTargets} targets</span>
            </div>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
