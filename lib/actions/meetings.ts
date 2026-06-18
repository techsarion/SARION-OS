'use server';
// Meetings — create, notes/minutes, participants, and action items (with
// convert-to-task). Small all-admin team: any member may run the full workflow.
// Each mutation runs through guard + audit logging + the ActionResult contract.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { sendEmailSafe } from '@/lib/email';
import { MeetingType, MeetingRecurrence, TaskStatus } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type MeetingInsert = Database['public']['Tables']['meetings']['Insert'];
type MeetingUpdate = Database['public']['Tables']['meetings']['Update'];
type ActionItemInsert = Database['public']['Tables']['meeting_action_items']['Insert'];
type ActionItemUpdate = Database['public']['Tables']['meeting_action_items']['Update'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const createSchema = z.object({
  title: z.string().min(2, 'Give the meeting a clear title.').max(200),
  type: z.enum([MeetingType.STANDUP, MeetingType.WEEKLY_REVIEW, MeetingType.MONTHLY_REVIEW, MeetingType.STRATEGY]).default(MeetingType.STANDUP),
  scheduled_at: z.string().min(1, 'Pick a date and time.').refine(
    (v) => { const d = new Date(v); return !Number.isNaN(d.getTime()) && d.getTime() > Date.now() - 60 * 60 * 1000; },
    'Meeting time must be in the future.',
  ),
  duration_min: z.coerce.number().int().min(5).max(480).default(30),
  agenda: z.string().max(5000).optional().or(z.literal('')).transform((v) => v || null),
  recurrence: z.enum([MeetingRecurrence.NONE, MeetingRecurrence.DAILY, MeetingRecurrence.WEEKLY, MeetingRecurrence.MONTHLY]).default(MeetingRecurrence.NONE),
  participant_ids: z.string().optional().transform((v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)),
});

// How many future occurrences to materialise for a recurring series.
const RECURRENCE_COUNT: Record<string, number> = { DAILY: 14, WEEKLY: 8, MONTHLY: 6 };

/** Build the list of occurrence start-times for a recurrence, including the first. */
function occurrenceDates(start: Date, recurrence: string): Date[] {
  const count = RECURRENCE_COUNT[recurrence];
  if (!count) return [start];
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    if (recurrence === 'DAILY') d.setDate(d.getDate() + i);
    else if (recurrence === 'WEEKLY') d.setDate(d.getDate() + i * 7);
    else if (recurrence === 'MONTHLY') d.setMonth(d.getMonth() + i);
    dates.push(d);
  }
  return dates;
}

export async function createMeeting(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await guard('meeting:create');
  if (!g.ok) return g.error;
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  try {
    const supabase = await createClient();
    const recurring = d.recurrence !== MeetingRecurrence.NONE;
    const seriesId = recurring ? globalThis.crypto.randomUUID() : null;
    const dates = occurrenceDates(new Date(d.scheduled_at), d.recurrence);

    const rows: MeetingInsert[] = dates.map((dt) => ({
      title: d.title, type: d.type, organizer_id: g.user.id,
      scheduled_at: dt.toISOString(), duration_min: d.duration_min,
      agenda: d.agenda as never, recurrence: d.recurrence, series_id: seriesId,
    }));
    const { data: createdRows, error } = await supabase.from('meetings').insert(rows as never).select('id, scheduled_at');
    if (error || !createdRows) return fail(error?.message ?? 'Could not create the meeting.');
    const created = (createdRows as { id: string; scheduled_at: string }[]).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const firstId = created[0].id;

    // Participants on every occurrence (always include the organizer).
    const ids = Array.from(new Set([g.user.id, ...d.participant_ids]));
    if (ids.length) {
      const partRows = created.flatMap((m) => ids.map((user_id) => ({ meeting_id: m.id, user_id })));
      await supabase.from('meeting_participants').insert(partRows as never);
    }
    await logActivity({ action: 'meeting.create', resourceType: 'meeting', resourceId: firstId, after: { title: d.title, type: d.type, recurrence: d.recurrence, occurrences: created.length } });

    // Best-effort invitations — one per invitee (covers the series, not per occurrence).
    const invitees = d.participant_ids.filter((id) => id !== g.user.id);
    if (invitees.length) {
      const { data: people } = await supabase.from('profiles').select('id, email, full_name').in('id', invitees);
      const seriesNote = recurring ? ` (repeats ${d.recurrence.toLowerCase()})` : '';
      for (const p of (people ?? []) as { id: string; email: string; full_name: string }[]) {
        await sendEmailSafe('meetingInvitation', p.email, {
          inviteeName: p.full_name, title: `${d.title}${seriesNote}`, dateTime: new Date(d.scheduled_at).toLocaleString(),
          durationMin: d.duration_min, organizer: g.user.fullName, meetingUrl: `${APP_URL}/meetings/${firstId}`,
          agenda: d.agenda ?? undefined,
        });
      }
    }
    revalidatePath('/meetings');
    return ok({ id: firstId });
  } catch (err) {
    return failFrom(err);
  }
}

const notesSchema = z.object({ notes: z.string().max(20000).optional().or(z.literal('')).transform((v) => v || null) });

export async function saveMeetingNotes(id: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('meeting:minute');
  if (!g.ok) return g.error;
  const parsed = notesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Could not save notes.');
  try {
    const supabase = await createClient();
    const patch: MeetingUpdate = { notes: parsed.data.notes };
    const { error } = await supabase.from('meetings').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'meeting.minute', resourceType: 'meeting', resourceId: id });
    revalidatePath(`/meetings/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function addActionItem(meetingId: string, description: string, assigneeId: string | null, dueDate?: string | null): Promise<ActionResult> {
  const g = await guard('meeting:minute');
  if (!g.ok) return g.error;
  if (!description.trim()) return fail('Describe the action item.');
  try {
    const supabase = await createClient();
    const row: ActionItemInsert = { meeting_id: meetingId, description: description.trim(), assignee_id: assigneeId, due_date: dueDate || null };
    const { error } = await supabase.from('meeting_action_items').insert(row as never);
    if (error) return fail(error.message);
    await logActivity({ action: 'meeting.action_add', resourceType: 'meeting', resourceId: meetingId });
    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath('/actions');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function toggleActionItem(id: string, meetingId: string, done: boolean): Promise<ActionResult> {
  const g = await guard('meeting:minute');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const patch: ActionItemUpdate = { done };
    const { error } = await supabase.from('meeting_action_items').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'meeting.action_toggle', resourceType: 'meeting', resourceId: meetingId, after: { done } });
    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath('/actions');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function deleteActionItem(id: string, meetingId: string): Promise<ActionResult> {
  const g = await guard('meeting:minute');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('meeting_action_items').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath('/actions');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

/** Turn a meeting action item into a real task and link them. */
export async function convertActionItemToTask(id: string, meetingId: string): Promise<ActionResult<{ taskId: string }>> {
  const g = await guard('task:create');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { data: item } = await supabase.from('meeting_action_items').select('description, assignee_id, task_id').eq('id', id)
      .maybeSingle<{ description: string; assignee_id: string | null; task_id: string | null }>();
    if (!item) return fail('Action item not found.');
    if (item.task_id) return fail('This action item is already a task.');

    const taskRow: TaskInsert = {
      title: item.description, owner_id: g.user.id, assignee_id: item.assignee_id,
      status: item.assignee_id ? TaskStatus.ASSIGNED : TaskStatus.DRAFT,
    };
    const { data: task, error } = await supabase.from('tasks').insert(taskRow as never).select('id').single<{ id: string }>();
    if (error || !task) return fail(error?.message ?? 'Could not create the task.');

    const patch: ActionItemUpdate = { task_id: task.id, done: true };
    await supabase.from('meeting_action_items').update(patch as never).eq('id', id);
    await logActivity({ action: 'meeting.action_to_task', resourceType: 'meeting', resourceId: meetingId, after: { taskId: task.id } });
    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath('/actions');
    revalidatePath('/tasks');
    return ok({ taskId: task.id });
  } catch (err) {
    return failFrom(err);
  }
}

export async function deleteMeeting(id: string): Promise<ActionResult> {
  const g = await guard('meeting:create');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'meeting.delete', resourceType: 'meeting', resourceId: id });
    revalidatePath('/meetings');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}
