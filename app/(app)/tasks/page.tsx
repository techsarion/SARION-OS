import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getTasks } from '@/lib/server/data/tasks';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { TasksWorkspace } from '@/components/tasks/tasks-workspace';
import { OverdueSweepButton } from '@/components/tasks/overdue-sweep-button';

export const metadata = { title: 'Tasks — Sarion Team OS' };

export default async function TasksPage() {
  const user = await requirePermission('task:read');
  const tasks = await getTasks();

  const canCreate = can(user.role, 'task:create');
  const canSweep = can(user.role, 'analytics:company');

  return (
    <div className="mx-auto max-w-[1320px] fade-up">
      <PageHeader title="Tasks" subtitle="Plan, assign, and track the team's work.">
        {canSweep && <OverdueSweepButton />}
        {canCreate && (
          <Link href="/tasks/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            <Plus className="h-4 w-4" /> New task
          </Link>
        )}
      </PageHeader>

      <TasksWorkspace tasks={tasks} currentUserId={user.id} />
    </div>
  );
}
