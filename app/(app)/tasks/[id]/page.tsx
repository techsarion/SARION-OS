import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Plus, CalendarClock, Clock, Building2, User, AlertTriangle } from 'lucide-react';
import { requirePermission, getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getTaskDetail, getTasks } from '@/lib/server/data/tasks';
import { getProfilesLite } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/misc';
import { buttonVariants } from '@/components/ui/button';
import { PriorityBadge } from '@/components/tasks/badges';
import { StatusControl } from '@/components/tasks/status-control';
import { AssigneeControl } from '@/components/tasks/assignee-control';
import { WatchButton } from '@/components/tasks/watch-button';
import { CommentForm } from '@/components/tasks/comment-form';
import { DependencyControl } from '@/components/tasks/dependency-control';
import { AttachmentControl } from '@/components/tasks/attachment-control';
import { TaskDeleteButton } from '@/components/tasks/task-delete-button';
import { TaskCard } from '@/components/tasks/task-card';

export const metadata = { title: 'Task — Sarion Team OS' };

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('task:read');
  const viewer = await getCurrentUser();
  const { id } = await params;
  const task = await getTaskDetail(id);
  if (!task) notFound();

  const canManage = viewer ? can(viewer.role, 'task:create') : false;
  const canAssign = viewer ? can(viewer.role, 'task:assign') : false;
  const canChangeStatus = viewer ? can(viewer.role, 'task:transition') : false;
  const canDelete = viewer ? can(viewer.role, 'task:delete') : false;
  const watching = viewer ? task.watchers.some((w) => w.userId === viewer.id) : false;

  const [people, allTasks] = await Promise.all([
    canAssign || canManage ? getProfilesLite() : Promise.resolve([]),
    canManage ? getTasks() : Promise.resolve([]),
  ]);
  const depCandidates = allTasks
    .filter((t) => t.id !== id && !task.dependencies.some((d) => d.taskId === t.id))
    .map((t) => ({ id: t.id, title: t.title }));

  return (
    <div className="mx-auto max-w-[1200px] fade-up">
      <Link href="/tasks" className="mb-3 inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to tasks
      </Link>

      <PageHeader title={task.title} subtitle={task.departmentName ? `${task.departmentName} · created ${task.createdAt.slice(0, 10)}` : `Created ${task.createdAt.slice(0, 10)}`}>
        <WatchButton taskId={task.id} watching={watching} />
        {canManage && (
          <Link href={`/tasks/${task.id}/edit`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        )}
        {canDelete && <TaskDeleteButton taskId={task.id} title={task.title} />}
      </PageHeader>

      {task.isOverdue && (
        <div className="mb-4 flex items-center gap-2 rounded-sm border border-danger/30 bg-danger-soft px-3.5 py-2 text-body-sm text-danger">
          <AlertTriangle className="h-4 w-4" /> This task is overdue (was due {task.due_date}).
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent>
              {task.description ? (
                <p className="whitespace-pre-wrap text-body-sm text-text-secondary">{task.description}</p>
              ) : (
                <p className="text-body-sm text-text-muted">No description.</p>
              )}
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader>
              <CardTitle>Subtasks ({task.subtasks.length})</CardTitle>
              {canManage && (
                <Link href={`/tasks/new?parent=${task.id}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                  <Plus className="h-4 w-4" /> Add subtask
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {task.subtasks.length === 0 ? (
                <p className="text-body-sm text-text-muted">No subtasks.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {task.subtasks.map((s) => <TaskCard key={s.id} task={s} showStatus />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader><CardTitle>Comments ({task.comments.length})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CommentForm taskId={task.id} />
              {task.comments.length === 0 ? (
                <p className="text-body-sm text-text-muted">No comments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {task.comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <Avatar name={c.authorName} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-body-sm font-medium text-text">{c.authorName}</span>
                          <span className="text-caption text-text-muted">{c.createdAt.slice(0, 10)}</span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-body-sm text-text-secondary">{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent>
              {task.activity.length === 0 ? (
                <p className="text-body-sm text-text-muted">No activity recorded.</p>
              ) : (
                <ul className="space-y-2.5">
                  {task.activity.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5 text-body-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <div>
                        <span className="text-text">{a.actorName ?? 'System'}</span>{' '}
                        <span className="text-text-secondary">{a.verb.replace(/_/g, ' ')}</span>
                        <span className="ml-2 text-caption text-text-muted">{a.createdAt.slice(0, 16).replace('T', ' ')}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <StatusControl taskId={task.id} status={task.status} canChange={canChangeStatus} />
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <span className="text-caption text-text-muted">Priority</span>
                <PriorityBadge priority={task.priority} />
              </div>
              {canAssign ? (
                <AssigneeControl taskId={task.id} assigneeId={task.assigneeId} people={people} />
              ) : (
                <Meta icon={User} label="Assignee" value={task.assigneeName ?? 'Unassigned'} />
              )}
              <div className="space-y-2 border-t border-border pt-3 text-body-sm">
                <Meta icon={User} label="Owner" value={task.ownerName ?? '—'} />
                <Meta icon={Building2} label="Department" value={task.departmentName ?? '—'} />
                {task.start_date && <Meta icon={CalendarClock} label="Start" value={task.start_date} />}
                {task.due_date && <Meta icon={CalendarClock} label="Due" value={task.due_date} />}
                {task.estimatedHours != null && <Meta icon={Clock} label="Estimate" value={`${task.estimatedHours}h`} />}
              </div>
              {task.tags.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="flex flex-wrap gap-1.5">{task.tags.map((t) => <Badge key={t} tone="outline">{t}</Badge>)}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Watchers ({task.watchers.length})</CardTitle></CardHeader>
            <CardContent>
              {task.watchers.length === 0 ? (
                <p className="text-body-sm text-text-muted">No watchers.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {task.watchers.map((w) => (
                    <span key={w.userId} className="inline-flex items-center gap-1.5 text-caption text-text-secondary">
                      <Avatar name={w.name} size={20} /> {w.name}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Dependencies</CardTitle></CardHeader>
            <CardContent>
              <DependencyControl
                taskId={task.id}
                dependencies={task.dependencies}
                dependents={task.dependents}
                candidates={depCandidates}
                canManage={canManage}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attachments ({task.attachments.length})</CardTitle></CardHeader>
            <CardContent>
              <AttachmentControl taskId={task.id} attachments={task.attachments} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-text-muted"><Icon className="h-4 w-4" /> {label}</span>
      <span className="text-text-secondary">{value}</span>
    </p>
  );
}
