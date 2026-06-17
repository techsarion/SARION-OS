import { requirePermission } from '@/lib/auth';
import { getProfilesLite, getDepartments } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { TaskForm } from '@/components/tasks/task-form';

export const metadata = { title: 'New task — Sarion Team OS' };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ parent?: string }> }) {
  await requirePermission('task:create');
  const { parent } = await searchParams;
  const [assignees, departments] = await Promise.all([getProfilesLite(), getDepartments()]);

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title={parent ? 'New subtask' : 'New task'} subtitle="Describe the work, set priority, and assign an owner." />
      <Card><CardContent>
        <TaskForm
          mode="create"
          assignees={assignees}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          parentTaskId={parent}
        />
      </CardContent></Card>
    </div>
  );
}
