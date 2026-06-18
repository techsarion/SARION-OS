import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth';
import { getTaskDetail } from '@/lib/server/data/tasks';
import { getProfilesLite } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { TaskForm } from '@/components/tasks/task-form';

export const metadata = { title: 'Edit task — Sarion Team OS' };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('task:create');
  const { id } = await params;
  const [task, assignees] = await Promise.all([getTaskDetail(id), getProfilesLite()]);
  if (!task) notFound();

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title={`Edit: ${task.title}`} subtitle="Update task details. Assignment and status are managed on the task page." />
      <Card><CardContent>
        <TaskForm
          mode="edit"
          taskId={task.id}
          defaults={{
            title: task.title, description: task.description, priority: task.priority,
            due_date: task.due_date, start_date: task.start_date, department_id: task.departmentId,
            estimated_hours: task.estimatedHours, tags: task.tags,
          }}
          assignees={assignees}
        />
      </CardContent></Card>
    </div>
  );
}
