import 'server-only';
// Aggregated Meeting Action Tracking — every action item across all meetings,
// with its meeting context, assignee, due date, task link and open/overdue/done
// status. Powers the /actions tracker.
import { createClient } from '@/lib/supabase/server';

export interface ActionRow {
  id: string;
  description: string;
  meetingId: string;
  meetingTitle: string;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  done: boolean;
  taskId: string | null;
  isOverdue: boolean;
}

export interface ActionBuckets {
  open: ActionRow[];
  overdue: ActionRow[];
  completed: ActionRow[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export async function getActionBuckets(): Promise<ActionBuckets> {
  const supabase = await createClient();
  const [{ data: items }, { data: meetings }, { data: people }] = await Promise.all([
    supabase.from('meeting_action_items').select('id, description, meeting_id, assignee_id, due_date, done, task_id').order('created_at', { ascending: false }),
    supabase.from('meetings').select('id, title'),
    supabase.from('profiles').select('id, full_name'),
  ]);
  const titles = new Map(((meetings ?? []) as { id: string; title: string }[]).map((m) => [m.id, m.title]));
  const names = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const today = todayISO();

  const rows: ActionRow[] = ((items ?? []) as { id: string; description: string; meeting_id: string; assignee_id: string | null; due_date: string | null; done: boolean; task_id: string | null }[]).map((a) => ({
    id: a.id,
    description: a.description,
    meetingId: a.meeting_id,
    meetingTitle: titles.get(a.meeting_id) ?? 'Meeting',
    assigneeId: a.assignee_id,
    assigneeName: a.assignee_id ? names.get(a.assignee_id) ?? null : null,
    dueDate: a.due_date,
    done: a.done,
    taskId: a.task_id,
    isOverdue: !a.done && !!a.due_date && a.due_date < today,
  }));

  return {
    open: rows.filter((r) => !r.done && !r.isOverdue),
    overdue: rows.filter((r) => r.isOverdue),
    completed: rows.filter((r) => r.done),
  };
}
