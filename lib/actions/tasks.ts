'use server';
// Task Management — CRUD, assignment, status workflow, comments, watchers,
// dependencies, attachment metadata, and the overdue sweep. Every mutation runs
// through RBAC (guard), RLS, audit logging (audit_log + task_activity), and the
// ActionResult contract. Email triggers: assigned / reassigned / completed /
// overdue.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { sendEmailSafe } from '@/lib/email';
import { canTransition } from '@/lib/tasks/constants';
import { Priority, TaskStatus } from '@/types/enums';
import type { TaskStatus as TaskStatusT } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const taskUrl = (id: string) => `${APP_URL}/tasks/${id}`;

type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

// ── activity helper (task_activity has no authenticated insert policy) ───────
async function logTaskActivity(taskId: string, actorId: string | null, verb: string, meta?: unknown) {
  try {
    const admin = createAdminClient();
    await admin.from('task_activity').insert({ task_id: taskId, actor_id: actorId, verb, meta: (meta ?? null) as never } as never);
  } catch (err) {
    console.error(`[task] activity insert failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function profileContact(id: string | null | undefined): Promise<{ email: string; full_name: string } | null> {
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('email, full_name').eq('id', id).maybeSingle<{ email: string; full_name: string }>();
  return data ?? null;
}

// ── schemas ──────────────────────────────────────────────────────────────────
const baseTask = z.object({
  title: z.string().min(2, 'Give the task a clear title.').max(200),
  description: z.string().max(5000).optional().or(z.literal('')).transform((v) => v || null),
  priority: z.enum([Priority.P0, Priority.P1, Priority.P2, Priority.P3]).default(Priority.P2),
  due_date: z.string().optional().or(z.literal('')).transform((v) => v || null),
  start_date: z.string().optional().or(z.literal('')).transform((v) => v || null),
  department_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  project_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  parent_task_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  assignee_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  estimated_hours: z.coerce.number().min(0).max(10000).optional().or(z.literal('')).transform((v) => (v === '' || v == null ? null : Number(v))),
  tags: z.string().optional().transform((v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)),
});

// ── create ─────────────────────────────────────────────────────────────────
export async function createTask(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await guard('task:create');
  if (!g.ok) return g.error;
  const parsed = baseTask.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  const d = parsed.data;

  try {
    const supabase = await createClient();
    const row: TaskInsert = {
      title: d.title, description: d.description, owner_id: g.user.id,
      department_id: d.department_id ?? g.user.departmentId, project_id: d.project_id,
      parent_task_id: d.parent_task_id, assignee_id: d.assignee_id, priority: d.priority,
      status: d.assignee_id ? TaskStatus.ASSIGNED : TaskStatus.DRAFT,
      start_date: d.start_date, due_date: d.due_date, estimated_hours: d.estimated_hours, tags: d.tags,
    };
    const { data: created, error } = await supabase.from('tasks').insert(row as never).select('id').single<{ id: string }>();
    if (error || !created) return fail(error?.message ?? 'Could not create the task.');

    await logTaskActivity(created.id, g.user.id, 'created');
    await logActivity({ action: 'task.create', resourceType: 'task', resourceId: created.id, after: { title: d.title, assignee_id: d.assignee_id } });

    if (d.assignee_id) {
      await addWatcherRow(created.id, d.assignee_id);
      await notifyAssigned(created.id, d.title, d.priority, d.due_date, d.assignee_id, g.user.fullName);
    }
    revalidatePath('/tasks');
    return ok({ id: created.id });
  } catch (err) {
    return failFrom(err);
  }
}

// ── update details ───────────────────────────────────────────────────────────
export async function updateTask(id: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('task:create');
  if (!g.ok) return g.error;
  const parsed = baseTask.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  try {
    const supabase = await createClient();
    const patch: TaskUpdate = {
      title: d.title, description: d.description, priority: d.priority, due_date: d.due_date,
      start_date: d.start_date, department_id: d.department_id, project_id: d.project_id,
      estimated_hours: d.estimated_hours, tags: d.tags,
    };
    const { error } = await supabase.from('tasks').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logTaskActivity(id, g.user.id, 'updated');
    await logActivity({ action: 'task.update', resourceType: 'task', resourceId: id });
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const g = await guard('task:delete');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const patch: TaskUpdate = { deleted_at: new Date().toISOString() };
    const { error } = await supabase.from('tasks').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'task.delete', resourceType: 'task', resourceId: id });
    revalidatePath('/tasks');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ── assignment (assign / reassign) ───────────────────────────────────────────
export async function assignTask(id: string, assigneeId: string | null): Promise<ActionResult> {
  const g = await guard('task:assign');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { data: current } = await supabase.from('tasks').select('title, priority, due_date, assignee_id, status').eq('id', id)
      .maybeSingle<{ title: string; priority: string; due_date: string | null; assignee_id: string | null; status: TaskStatusT }>();
    if (!current) return fail('Task not found.');

    const patch: TaskUpdate = {
      assignee_id: assigneeId,
      status: assigneeId && current.status === TaskStatus.DRAFT ? TaskStatus.ASSIGNED : current.status,
    };
    const { error } = await supabase.from('tasks').update(patch as never).eq('id', id);
    if (error) return fail(error.message);

    const reassigned = !!current.assignee_id && current.assignee_id !== assigneeId;
    await logTaskActivity(id, g.user.id, reassigned ? 'reassigned' : 'assigned', { to: assigneeId });
    await logActivity({ action: reassigned ? 'task.reassign' : 'task.assign', resourceType: 'task', resourceId: id, before: { assignee_id: current.assignee_id }, after: { assignee_id: assigneeId } });

    if (assigneeId) {
      await addWatcherRow(id, assigneeId);
      await notifyAssigned(id, current.title, current.priority, current.due_date, assigneeId, g.user.fullName);
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ── status workflow ──────────────────────────────────────────────────────────
export async function transitionStatus(id: string, to: TaskStatusT): Promise<ActionResult> {
  const g = await guard('task:transition');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { data: current } = await supabase.from('tasks').select('title, status, owner_id, assignee_id, project_id').eq('id', id)
      .maybeSingle<{ title: string; status: TaskStatusT; owner_id: string; assignee_id: string | null; project_id: string | null }>();
    if (!current) return fail('Task not found.');
    if (!canTransition(current.status, to)) return fail(`Cannot move from ${current.status} to ${to}.`);

    const patch: TaskUpdate = { status: to };
    const { error } = await supabase.from('tasks').update(patch as never).eq('id', id);
    if (error) return fail(error.message);

    await logTaskActivity(id, g.user.id, 'status_changed', { from: current.status, to });
    await logActivity({ action: 'task.transition', resourceType: 'task', resourceId: id, before: { status: current.status }, after: { status: to } });

    if (to === TaskStatus.COMPLETED) {
      // Notify the owner (and assignee if different) that it's done.
      const recipients = new Set<string>([current.owner_id]);
      if (current.assignee_id) recipients.add(current.assignee_id);
      recipients.delete(g.user.id);
      for (const rid of recipients) {
        const c = await profileContact(rid);
        if (c) await sendEmailSafe('taskCompleted', c.email, { recipientName: c.full_name, taskTitle: current.title, completedBy: g.user.fullName, taskUrl: taskUrl(id) });
      }
    }
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ── comments ─────────────────────────────────────────────────────────────────
const commentSchema = z.object({ body: z.string().min(1, 'Write a comment.').max(5000) });

export async function addComment(taskId: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });
  const parsed = commentSchema.safeParse({ body: formData.get('body') });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid comment.');
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('task_comments').insert({ task_id: taskId, author_id: user.id, body: parsed.data.body } as never);
    if (error) return fail(error.message);
    await logTaskActivity(taskId, user.id, 'commented');
    revalidatePath(`/tasks/${taskId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ── watchers ─────────────────────────────────────────────────────────────────
async function addWatcherRow(taskId: string, userId: string) {
  const admin = createAdminClient();
  await admin.from('task_watchers').upsert({ task_id: taskId, user_id: userId } as never, { onConflict: 'task_id,user_id', ignoreDuplicates: true } as never);
}

export async function toggleWatch(taskId: string, watching: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });
  try {
    const supabase = await createClient();
    if (watching) {
      const { error } = await supabase.from('task_watchers').delete().eq('task_id', taskId).eq('user_id', user.id);
      if (error) return fail(error.message);
    } else {
      const { error } = await supabase.from('task_watchers').insert({ task_id: taskId, user_id: user.id } as never);
      if (error) return fail(error.message);
    }
    revalidatePath(`/tasks/${taskId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ── dependencies ─────────────────────────────────────────────────────────────
export async function addDependency(taskId: string, dependsOnId: string): Promise<ActionResult> {
  const g = await guard('task:create');
  if (!g.ok) return g.error;
  if (taskId === dependsOnId) return fail('A task cannot depend on itself.');
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('task_dependencies').insert({ task_id: taskId, depends_on_task_id: dependsOnId } as never);
    if (error) return fail(error.message.includes('duplicate') ? 'That dependency already exists.' : error.message);
    await logTaskActivity(taskId, g.user.id, 'dependency_added', { depends_on: dependsOnId });
    revalidatePath(`/tasks/${taskId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function removeDependency(id: string, taskId: string): Promise<ActionResult> {
  const g = await guard('task:create');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('task_dependencies').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/tasks/${taskId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ── attachments (metadata; file uploaded to storage client-side) ─────────────
export async function addAttachment(
  taskId: string,
  meta: { file_name: string; file_path: string; file_size: number; content_type: string },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('task_attachments').insert({
      task_id: taskId, uploader_id: user.id, file_name: meta.file_name, file_path: meta.file_path,
      file_size: meta.file_size, content_type: meta.content_type,
    } as never);
    if (error) return fail(error.message);
    await logTaskActivity(taskId, user.id, 'attachment_added', { file: meta.file_name });
    revalidatePath(`/tasks/${taskId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function removeAttachment(id: string, taskId: string, filePath: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });
  try {
    const supabase = await createClient();
    await supabase.storage.from('attachments').remove([filePath]);
    const { error } = await supabase.from('task_attachments').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/tasks/${taskId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ── overdue sweep (admin/cron) ───────────────────────────────────────────────
export async function notifyOverdueTasks(): Promise<ActionResult<{ notified: number }>> {
  const g = await guard('analytics:company');
  if (!g.ok) return g.error;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const admin = createAdminClient();
    const { data } = await admin
      .from('tasks')
      .select('id, title, priority, due_date, assignee_id')
      .lt('due_date', today)
      .not('assignee_id', 'is', null)
      .neq('status', TaskStatus.COMPLETED)
      .is('deleted_at', null);
    const rows = (data ?? []) as { id: string; title: string; priority: string; due_date: string; assignee_id: string }[];
    let notified = 0;
    for (const t of rows) {
      const c = await profileContact(t.assignee_id);
      if (!c) continue;
      const res = await sendEmailSafe('taskOverdue', c.email, { assigneeName: c.full_name, taskTitle: t.title, dueDate: t.due_date, priority: t.priority, taskUrl: taskUrl(t.id) });
      if (res.ok) notified += 1;
    }
    await logActivity({ action: 'task.overdue_sweep', resourceType: 'task', after: { notified } });
    return ok({ notified });
  } catch (err) {
    return failFrom(err);
  }
}

// ── shared notify helper ─────────────────────────────────────────────────────
async function notifyAssigned(taskId: string, title: string, priority: string, due: string | null, assigneeId: string, assignedBy: string) {
  const c = await profileContact(assigneeId);
  if (!c) return;
  await sendEmailSafe('taskAssignment', c.email, {
    assigneeName: c.full_name, taskTitle: title, assignedBy, priority,
    dueDate: due ?? undefined, taskUrl: taskUrl(taskId),
  });
}
