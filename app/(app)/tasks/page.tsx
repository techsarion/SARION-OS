import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { createClient } from '@/lib/supabase/server';
import { getTasks } from '@/lib/server/data/tasks';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { TasksWorkspace } from '@/components/tasks/tasks-workspace';
import { OverdueSweepButton } from '@/components/tasks/overdue-sweep-button';

export const metadata = { title: 'Tasks — Sarion Team OS' };

export default async function TasksPage() {
  const user = await requirePermission('task:read');
  const tasks = await getTasks();

  // Current user's team for the "Team Tasks" scope (not on CurrentUser).
  const supabase = await createClient();
  const { data: me } = await supabase.from('profiles').select('team_id').eq('id', user.id).maybeSingle<{ team_id: string | null }>();

  const canCreate = can(user.role, 'task:create');
  const canSweep = can(user.role, 'analytics:company');

  return (
    <div className="mx-auto max-w-[1320px] fade-up">
      <PageHeader title="Tasks" subtitle="Plan, assign, and track work across the organisation.">
        {canSweep && <OverdueSweepButton />}
        {canCreate && (
          <Link href="/tasks/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            <Plus className="h-4 w-4" /> New task
          </Link>
        )}
      </PageHeader>

      <TasksWorkspace
        tasks={tasks}
        currentUserId={user.id}
        currentUserDeptId={user.departmentId}
        currentUserTeamId={me?.team_id ?? null}
      />
    </div>
  );
}
