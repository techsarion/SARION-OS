'use server';
// Daily Execution Workspace — server actions. Everything the workspace page
// mutates flows through here: the workspace meta (focus / priorities / blockers /
// progress), the to-do rows (add / edit / reorder / state / delete), live notes,
// per-task carry-forward, and the end-of-day "Finish My Day" flow that carries
// unfinished work into tomorrow (or next week) and stamps the reflection.
//
// Follows the tasks/leads convention: guard('daily:write') → mutate via the
// RLS client → dual logging (daily activity timeline + global audit) →
// revalidate → ok/fail/failFrom, all wrapped in try/catch.
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/server/guard';
import { logDailyActivity } from '@/lib/server/daily-activity';
import { logActivity } from '@/lib/server/activity';
import { DailyTaskState } from '@/types/enums';
import type { DailyTaskState as StateT } from '@/types/enums';
import { MAX_PRIORITIES } from '@/lib/daily/constants';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
};
const clampState = (s: string): StateT =>
  (Object.values(DailyTaskState) as string[]).includes(s) ? (s as StateT) : DailyTaskState.NOT_STARTED;

/** Insert-or-return today's (or target date's) workspace row id for a user. */
async function ensureWorkspace(userId: string, date: string): Promise<string> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from('daily_workspaces')
    .select('id').eq('user_id', userId).eq('work_date', date).maybeSingle<{ id: string }>();
  if (existing?.id) return existing.id;
  const { data, error } = await supabase.from('daily_workspaces')
    .insert({ user_id: userId, work_date: date } as never).select('id').single<{ id: string }>();
  if (error || !data) throw new Error(error?.message ?? 'Could not open your workspace.');
  return data.id;
}

// ── Workspace meta (focus / priorities / blockers / progress) ────────────────
export interface WorkspaceMetaInput {
  focus?: string | null;
  priorities?: string[];
  blockers?: string | null;
  progress?: string | null;
}
export async function saveWorkspaceMeta(input: WorkspaceMetaInput): Promise<ActionResult> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const date = todayISO();
    await ensureWorkspace(g.user.id, date);
    const patch: Record<string, unknown> = {};
    if (input.focus !== undefined) patch.focus = input.focus?.trim() || null;
    if (input.blockers !== undefined) patch.blockers = input.blockers?.trim() || null;
    if (input.progress !== undefined) patch.progress = input.progress?.trim() || null;
    if (input.priorities !== undefined) patch.priorities = input.priorities.map((p) => p.trim()).filter(Boolean).slice(0, MAX_PRIORITIES);
    const { error } = await supabase.from('daily_workspaces').update(patch as never)
      .eq('user_id', g.user.id).eq('work_date', date);
    if (error) return fail(error.message);
    revalidatePath('/check-in');
    return ok();
  } catch (err) { return failFrom(err); }
}

// ── Add / pull tasks ─────────────────────────────────────────────────────────
export interface AddTaskInput {
  title: string;
  priority?: string;
  category?: string | null;
  dueTime?: string | null;
  estimatedMinutes?: number | null;
}
export async function addTask(input: AddTaskInput): Promise<ActionResult<{ id: string }>> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    const title = input.title.trim();
    if (!title) return fail('Give the task a title.');
    const supabase = await createClient();
    const date = todayISO();
    const workspaceId = await ensureWorkspace(g.user.id, date);
    const sortOrder = await nextSortOrder(g.user.id, date);
    const { data, error } = await supabase.from('daily_workspace_tasks').insert({
      workspace_id: workspaceId, user_id: g.user.id, work_date: date, title,
      priority: input.priority ?? 'P2', category: input.category ?? null,
      due_time: input.dueTime || null, estimated_minutes: input.estimatedMinutes ?? null,
      sort_order: sortOrder, source: 'MANUAL',
    } as never).select('id').single<{ id: string }>();
    if (error || !data) return fail(error?.message ?? 'Could not add the task.');
    await logDailyActivity(workspaceId, g.user.id, 'task_created', { title, source: 'MANUAL' });
    revalidatePath('/check-in');
    return ok({ id: data.id });
  } catch (err) { return failFrom(err); }
}

export interface PullAutoInput {
  source: string;      // TASK | LEAD_FOLLOWUP | MEETING_ACTION | TARGET
  sourceRef: string;   // originating row id
  title: string;
}
/** Promote an auto-surfaced item into a real, checkable to-do row. */
export async function pullAutoItem(input: PullAutoInput): Promise<ActionResult<{ id: string }>> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const date = todayISO();
    const workspaceId = await ensureWorkspace(g.user.id, date);
    const sortOrder = await nextSortOrder(g.user.id, date);
    const { data, error } = await supabase.from('daily_workspace_tasks').insert({
      workspace_id: workspaceId, user_id: g.user.id, work_date: date, title: input.title.trim().slice(0, 500),
      priority: 'P2', sort_order: sortOrder, source: input.source as never, source_ref: input.sourceRef,
    } as never).select('id').single<{ id: string }>();
    if (error || !data) return fail(error?.message ?? 'Could not add the item.');
    await logDailyActivity(workspaceId, g.user.id, 'task_created', { title: input.title, source: input.source });
    revalidatePath('/check-in');
    return ok({ id: data.id });
  } catch (err) { return failFrom(err); }
}

async function nextSortOrder(userId: string, date: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from('daily_workspace_tasks')
    .select('sort_order').eq('user_id', userId).eq('work_date', date).is('deleted_at', null)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle<{ sort_order: number }>();
  return (data?.sort_order ?? -1) + 1;
}

// ── Task state / edit / reorder / delete ─────────────────────────────────────
export async function setTaskState(id: string, state: string): Promise<ActionResult> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const next = clampState(state);
    const { data: row, error } = await supabase.from('daily_workspace_tasks')
      .update({ state: next, completed_at: next === DailyTaskState.COMPLETED ? new Date().toISOString() : null } as never)
      .eq('id', id).select('workspace_id, title').single<{ workspace_id: string; title: string }>();
    if (error || !row) return fail(error?.message ?? 'Could not update the task.');
    await logDailyActivity(row.workspace_id, g.user.id, next === DailyTaskState.COMPLETED ? 'task_completed' : 'task_state_changed', { title: row.title, state: next });
    revalidatePath('/check-in');
    return ok();
  } catch (err) { return failFrom(err); }
}

export interface UpdateTaskInput {
  title?: string; priority?: string; category?: string | null;
  dueTime?: string | null; estimatedMinutes?: number | null;
}
export async function updateTask(id: string, patch: UpdateTaskInput): Promise<ActionResult> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const p: Record<string, unknown> = {};
    if (patch.title !== undefined) { const t = patch.title.trim(); if (!t) return fail('Title cannot be empty.'); p.title = t; }
    if (patch.priority !== undefined) p.priority = patch.priority;
    if (patch.category !== undefined) p.category = patch.category || null;
    if (patch.dueTime !== undefined) p.due_time = patch.dueTime || null;
    if (patch.estimatedMinutes !== undefined) p.estimated_minutes = patch.estimatedMinutes;
    const { error } = await supabase.from('daily_workspace_tasks').update(p as never).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/check-in');
    return ok();
  } catch (err) { return failFrom(err); }
}

export async function reorderTasks(orderedIds: string[]): Promise<ActionResult> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    // Sequential small updates — the daily list is short (a handful of rows).
    await Promise.all(orderedIds.map((id, i) =>
      supabase.from('daily_workspace_tasks').update({ sort_order: i } as never).eq('id', id).eq('user_id', g.user.id)));
    revalidatePath('/check-in');
    return ok();
  } catch (err) { return failFrom(err); }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { data: row, error } = await supabase.from('daily_workspace_tasks')
      .update({ deleted_at: new Date().toISOString() } as never).eq('id', id)
      .select('workspace_id, title').single<{ workspace_id: string; title: string }>();
    if (error || !row) return fail(error?.message ?? 'Could not delete the task.');
    await logDailyActivity(row.workspace_id, g.user.id, 'task_deleted', { title: row.title });
    revalidatePath('/check-in');
    return ok();
  } catch (err) { return failFrom(err); }
}

// ── Live progress notes ──────────────────────────────────────────────────────
export async function addNote(body: string): Promise<ActionResult> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    const text = body.trim();
    if (!text) return fail('Write something first.');
    const supabase = await createClient();
    const date = todayISO();
    const workspaceId = await ensureWorkspace(g.user.id, date);
    const { error } = await supabase.from('daily_notes')
      .insert({ workspace_id: workspaceId, user_id: g.user.id, work_date: date, body: text } as never);
    if (error) return fail(error.message);
    revalidatePath('/check-in');
    return ok();
  } catch (err) { return failFrom(err); }
}

// ── Carry-forward (single task) ──────────────────────────────────────────────
type CarryTarget = 'tomorrow' | 'next_week';
async function carryOne(userId: string, taskId: string, target: CarryTarget): Promise<void> {
  const supabase = await createClient();
  const { data: t } = await supabase.from('daily_workspace_tasks')
    .select('title, priority, category, estimated_minutes, work_date')
    .eq('id', taskId).single<{ title: string; priority: string; category: string | null; estimated_minutes: number | null; work_date: string }>();
  if (!t) return;
  const from = t.work_date;
  const to = target === 'tomorrow' ? addDays(from, 1) : addDays(from, 7);
  const workspaceId = await ensureWorkspace(userId, to);
  const sortOrder = await nextSortOrder(userId, to);
  const { data: created } = await supabase.from('daily_workspace_tasks').insert({
    workspace_id: workspaceId, user_id: userId, work_date: to, title: t.title, priority: t.priority,
    category: t.category, estimated_minutes: t.estimated_minutes, sort_order: sortOrder,
    source: 'CARRYOVER', carried_from_date: from,
  } as never).select('id').single<{ id: string }>();
  await supabase.from('task_carryovers').insert({ task_id: taskId, user_id: userId, from_date: from, to_date: to } as never);
  await logDailyActivity(workspaceId, userId, 'task_carried', { title: t.title, from, to, newId: created?.id ?? null });
}

/** Carry a single incomplete task forward from the workspace (outside EOD). */
export async function carryTask(id: string, target: CarryTarget): Promise<ActionResult> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    await carryOne(g.user.id, id, target);
    revalidatePath('/check-in');
    return ok();
  } catch (err) { return failFrom(err); }
}

// ── Finish My Day (End-of-Day) ───────────────────────────────────────────────
export type CarryAction = 'tomorrow' | 'next_week' | 'delete' | 'cancel';
export interface FinishDayInput {
  wentWell?: string | null;
  blockers?: string | null;
  tomorrow?: string | null;
  carries: { taskId: string; action: CarryAction }[];
}
export async function finishDay(input: FinishDayInput): Promise<ActionResult<{ carried: number; cancelled: number; deleted: number }>> {
  const g = await guard('daily:write');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const date = todayISO();
    const workspaceId = await ensureWorkspace(g.user.id, date);

    let carried = 0, cancelled = 0, deleted = 0;
    for (const c of input.carries) {
      if (c.action === 'tomorrow' || c.action === 'next_week') { await carryOne(g.user.id, c.taskId, c.action); carried++; }
      else if (c.action === 'cancel') {
        await supabase.from('daily_workspace_tasks').update({ state: DailyTaskState.CANCELLED } as never).eq('id', c.taskId);
        await logDailyActivity(workspaceId, g.user.id, 'task_cancelled', { taskId: c.taskId }); cancelled++;
      } else if (c.action === 'delete') {
        await supabase.from('daily_workspace_tasks').update({ deleted_at: new Date().toISOString() } as never).eq('id', c.taskId);
        deleted++;
      }
    }

    const { error } = await supabase.from('daily_workspaces').update({
      finished_at: new Date().toISOString(),
      eod_went_well: input.wentWell?.trim() || null,
      eod_blockers: input.blockers?.trim() || null,
      eod_tomorrow: input.tomorrow?.trim() || null,
    } as never).eq('id', workspaceId);
    if (error) return fail(error.message);

    await logDailyActivity(workspaceId, g.user.id, 'workspace_completed', { carried, cancelled, deleted });
    await logActivity({ action: 'daily.finish', resourceType: 'daily_workspace', resourceId: workspaceId, after: { carried, cancelled, deleted } });
    revalidatePath('/check-in');
    revalidatePath('/');
    return ok({ carried, cancelled, deleted });
  } catch (err) { return failFrom(err); }
}
