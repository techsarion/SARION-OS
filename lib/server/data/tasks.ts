import 'server-only';
// Read layer for the Task module. RLS scopes every query to what the caller may
// see (admins all; owner/assignee/department). Results are cast to explicit
// shapes (the pinned supabase client degrades inferred types to `never`).
import { createClient } from '@/lib/supabase/server';
import { OPEN_STATUSES } from '@/lib/tasks/constants';
import type { TaskStatus as TaskStatusT, Priority as PriorityT } from '@/types/enums';

const todayISO = () => new Date().toISOString().slice(0, 10);

export interface TaskListItem {
  id: string;
  title: string;
  status: TaskStatusT;
  priority: PriorityT;
  due_date: string | null;
  start_date: string | null;
  departmentId: string | null;
  departmentName: string | null;
  projectId: string | null;
  parentTaskId: string | null;
  ownerId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  assigneeTeamId: string | null;
  tags: string[];
  isOverdue: boolean;
  commentCount: number;
  subtaskCount: number;
  watcherCount: number;
}

interface ProfileLite { id: string; full_name: string; team_id: string | null; department_id: string | null; avatar_url: string | null }

async function profileMap(): Promise<Map<string, ProfileLite>> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name, team_id, department_id, avatar_url');
  const rows = (data ?? []) as ProfileLite[];
  return new Map(rows.map((p) => [p.id, p]));
}

type TaskSelect = {
  id: string; title: string; description: string | null; status: TaskStatusT; priority: PriorityT;
  due_date: string | null; start_date: string | null; department_id: string | null; project_id: string | null;
  parent_task_id: string | null; owner_id: string; assignee_id: string | null; tags: string[];
  estimated_hours: number | null; actual_hours: number | null; created_at: string;
};

function isOverdue(due: string | null, status: TaskStatusT): boolean {
  return !!due && status !== 'COMPLETED' && due < todayISO();
}

export async function getTasks(): Promise<TaskListItem[]> {
  const supabase = await createClient();
  const [taskRes, deptRes, comRes, watchRes, people] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, start_date, department_id, project_id, parent_task_id, owner_id, assignee_id, tags')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('departments').select('id, name'),
    supabase.from('task_comments').select('task_id'),
    supabase.from('task_watchers').select('task_id'),
    profileMap(),
  ]);
  const tasks = (taskRes.data ?? []) as TaskSelect[];
  const depts = (deptRes.data ?? []) as { id: string; name: string }[];
  const comments = (comRes.data ?? []) as { task_id: string }[];
  const watchers = (watchRes.data ?? []) as { task_id: string }[];
  const deptNames = new Map(depts.map((d) => [d.id, d.name]));
  const commentCounts = tally(comments.map((c) => c.task_id));
  const watcherCounts = tally(watchers.map((w) => w.task_id));
  const subtaskCounts = tally(tasks.map((t) => t.parent_task_id).filter(Boolean) as string[]);

  return tasks.map((t) => {
    const a = t.assignee_id ? people.get(t.assignee_id) : null;
    return {
      id: t.id, title: t.title, status: t.status, priority: t.priority,
      due_date: t.due_date, start_date: t.start_date,
      departmentId: t.department_id, departmentName: t.department_id ? deptNames.get(t.department_id) ?? null : null,
      projectId: t.project_id, parentTaskId: t.parent_task_id, ownerId: t.owner_id,
      assigneeId: t.assignee_id, assigneeName: a?.full_name ?? null, assigneeAvatar: a?.avatar_url ?? null, assigneeTeamId: a?.team_id ?? null,
      tags: t.tags ?? [],
      isOverdue: isOverdue(t.due_date, t.status),
      commentCount: commentCounts.get(t.id) ?? 0,
      subtaskCount: subtaskCounts.get(t.id) ?? 0,
      watcherCount: watcherCounts.get(t.id) ?? 0,
    };
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────
export interface TaskComment { id: string; body: string; authorId: string; authorName: string; authorAvatar: string | null; createdAt: string }
export interface TaskActivityItem { id: string; verb: string; actorName: string | null; createdAt: string; meta: unknown }
export interface TaskAttachment { id: string; fileName: string; filePath: string; fileSize: number | null; contentType: string | null; uploaderName: string | null; createdAt: string }
export interface TaskWatcher { userId: string; name: string; avatar: string | null }
export interface TaskLink { id: string; taskId: string; title: string; status: TaskStatusT }

export interface TaskDetail extends TaskListItem {
  description: string | null;
  ownerName: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  createdAt: string;
  comments: TaskComment[];
  activity: TaskActivityItem[];
  attachments: TaskAttachment[];
  watchers: TaskWatcher[];
  dependencies: TaskLink[]; // tasks this one depends on (blockers)
  dependents: TaskLink[]; // tasks that depend on this one
  subtasks: TaskListItem[];
}

export async function getTaskDetail(id: string): Promise<TaskDetail | null> {
  const supabase = await createClient();
  const { data: taskData } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, start_date, department_id, project_id, parent_task_id, owner_id, assignee_id, tags, estimated_hours, actual_hours, created_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle<TaskSelect>();
  if (!taskData) return null;

  const [people, deptRes, comRes, actRes, attRes, watchRes, depRes, depOnRes, all] = await Promise.all([
    profileMap(),
    supabase.from('departments').select('id, name'),
    supabase.from('task_comments').select('id, body, author_id, created_at').eq('task_id', id).order('created_at'),
    supabase.from('task_activity').select('id, verb, actor_id, meta, created_at').eq('task_id', id).order('created_at', { ascending: false }),
    supabase.from('task_attachments').select('id, file_name, file_path, file_size, content_type, uploader_id, created_at').eq('task_id', id).order('created_at'),
    supabase.from('task_watchers').select('user_id').eq('task_id', id),
    supabase.from('task_dependencies').select('id, depends_on_task_id').eq('task_id', id),
    supabase.from('task_dependencies').select('id, task_id').eq('depends_on_task_id', id),
    getTasks(),
  ]);

  const depts = (deptRes.data ?? []) as { id: string; name: string }[];
  const deptNames = new Map(depts.map((d) => [d.id, d.name]));
  const comments = (comRes.data ?? []) as { id: string; body: string; author_id: string; created_at: string }[];
  const activity = (actRes.data ?? []) as { id: string; verb: string; actor_id: string | null; meta: unknown; created_at: string }[];
  const attachments = (attRes.data ?? []) as { id: string; file_name: string; file_path: string; file_size: number | null; content_type: string | null; uploader_id: string | null; created_at: string }[];
  const watchers = (watchRes.data ?? []) as { user_id: string }[];
  const deps = (depRes.data ?? []) as { id: string; depends_on_task_id: string }[];
  const depsOn = (depOnRes.data ?? []) as { id: string; task_id: string }[];

  const byId = new Map(all.map((t) => [t.id, t]));
  const a = taskData.assignee_id ? people.get(taskData.assignee_id) : null;

  return {
    id: taskData.id, title: taskData.title, status: taskData.status, priority: taskData.priority,
    due_date: taskData.due_date, start_date: taskData.start_date,
    departmentId: taskData.department_id, departmentName: taskData.department_id ? deptNames.get(taskData.department_id) ?? null : null,
    projectId: taskData.project_id, parentTaskId: taskData.parent_task_id, ownerId: taskData.owner_id,
    assigneeId: taskData.assignee_id, assigneeName: a?.full_name ?? null, assigneeAvatar: a?.avatar_url ?? null, assigneeTeamId: a?.team_id ?? null,
    tags: taskData.tags ?? [], isOverdue: isOverdue(taskData.due_date, taskData.status),
    commentCount: comments.length, subtaskCount: all.filter((t) => t.parentTaskId === id).length,
    watcherCount: watchers.length,
    description: taskData.description, ownerName: people.get(taskData.owner_id)?.full_name ?? null,
    estimatedHours: taskData.estimated_hours, actualHours: taskData.actual_hours, createdAt: taskData.created_at,
    comments: comments.map((c) => ({ id: c.id, body: c.body, authorId: c.author_id, authorName: people.get(c.author_id)?.full_name ?? 'Unknown', authorAvatar: people.get(c.author_id)?.avatar_url ?? null, createdAt: c.created_at })),
    activity: activity.map((x) => ({ id: x.id, verb: x.verb, actorName: x.actor_id ? people.get(x.actor_id)?.full_name ?? null : null, createdAt: x.created_at, meta: x.meta })),
    attachments: attachments.map((f) => ({ id: f.id, fileName: f.file_name, filePath: f.file_path, fileSize: f.file_size, contentType: f.content_type, uploaderName: f.uploader_id ? people.get(f.uploader_id)?.full_name ?? null : null, createdAt: f.created_at })),
    watchers: watchers.map((w) => ({ userId: w.user_id, name: people.get(w.user_id)?.full_name ?? 'Unknown', avatar: people.get(w.user_id)?.avatar_url ?? null })),
    dependencies: deps.map((d) => linkOf(d.id, d.depends_on_task_id, byId)).filter(Boolean) as TaskLink[],
    dependents: depsOn.map((d) => linkOf(d.id, d.task_id, byId)).filter(Boolean) as TaskLink[],
    subtasks: all.filter((t) => t.parentTaskId === id),
  };
}

function linkOf(id: string, taskId: string, byId: Map<string, TaskListItem>): TaskLink | null {
  const t = byId.get(taskId);
  return t ? { id, taskId, title: t.title, status: t.status } : null;
}

export function isTaskOpen(status: TaskStatusT): boolean {
  return OPEN_STATUSES.includes(status);
}

function tally(values: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}
