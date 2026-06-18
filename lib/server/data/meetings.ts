import 'server-only';
// Read layer for the Meetings module. RLS lets the whole team see every meeting.
// Results cast to explicit shapes (the pinned supabase client degrades inferred
// types to `never`).
import { createClient } from '@/lib/supabase/server';

type MeetingTypeEnum = 'STANDUP' | 'WEEKLY_REVIEW' | 'MONTHLY_REVIEW' | 'STRATEGY';
type MeetingStatusEnum = 'CREATED' | 'INVITED' | 'CONDUCTED' | 'MINUTED' | 'CLOSED';
type MeetingRecurrenceEnum = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface MeetingListItem {
  id: string;
  title: string;
  type: MeetingTypeEnum;
  status: MeetingStatusEnum;
  organizerId: string;
  organizerName: string | null;
  scheduledAt: string;
  durationMin: number;
  participantCount: number;
  recurrence: MeetingRecurrenceEnum;
  isUpcoming: boolean;
}

export interface MeetingActionItem {
  id: string;
  description: string;
  assigneeId: string | null;
  assigneeName: string | null;
  taskId: string | null;
  done: boolean;
  dueDate: string | null;
}

export interface MeetingDetail extends MeetingListItem {
  agenda: string | null;
  notes: string | null;
  participants: { id: string; name: string }[];
  actionItems: MeetingActionItem[];
}

type MeetingSelect = {
  id: string; title: string; type: MeetingTypeEnum; status: MeetingStatusEnum; organizer_id: string;
  scheduled_at: string; duration_min: number; agenda: unknown; notes: string | null; recurrence: MeetingRecurrenceEnum;
};

async function nameMap(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name');
  return new Map(((data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
}

function agendaToText(agenda: unknown): string | null {
  if (!agenda) return null;
  if (typeof agenda === 'string') return agenda;
  if (Array.isArray(agenda)) return agenda.join('\n');
  return null;
}

export async function getMeetings(): Promise<MeetingListItem[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [{ data: mData }, { data: pData }, names] = await Promise.all([
    supabase.from('meetings').select('id, title, type, status, organizer_id, scheduled_at, duration_min, recurrence').order('scheduled_at', { ascending: false }),
    supabase.from('meeting_participants').select('meeting_id'),
    nameMap(),
  ]);
  const meetings = (mData ?? []) as (Omit<MeetingSelect, 'agenda' | 'notes'> & { recurrence: MeetingRecurrenceEnum })[];
  const parts = (pData ?? []) as { meeting_id: string }[];
  const counts = new Map<string, number>();
  for (const p of parts) counts.set(p.meeting_id, (counts.get(p.meeting_id) ?? 0) + 1);
  return meetings.map((m) => ({
    id: m.id, title: m.title, type: m.type, status: m.status,
    organizerId: m.organizer_id, organizerName: names.get(m.organizer_id) ?? null,
    scheduledAt: m.scheduled_at, durationMin: m.duration_min,
    participantCount: counts.get(m.id) ?? 0,
    recurrence: m.recurrence,
    isUpcoming: m.scheduled_at >= nowIso,
  }));
}

export async function getMeetingDetail(id: string): Promise<MeetingDetail | null> {
  const supabase = await createClient();
  const { data: mData } = await supabase
    .from('meetings')
    .select('id, title, type, status, organizer_id, scheduled_at, duration_min, agenda, notes, recurrence')
    .eq('id', id)
    .maybeSingle<MeetingSelect>();
  if (!mData) return null;

  const [{ data: pData }, { data: aData }, names] = await Promise.all([
    supabase.from('meeting_participants').select('user_id').eq('meeting_id', id),
    supabase.from('meeting_action_items').select('id, description, assignee_id, task_id, done, due_date').eq('meeting_id', id).order('created_at', { ascending: true }),
    nameMap(),
  ]);
  const participants = ((pData ?? []) as { user_id: string }[]).map((p) => ({ id: p.user_id, name: names.get(p.user_id) ?? 'Unknown' }));
  const actionItems = ((aData ?? []) as { id: string; description: string; assignee_id: string | null; task_id: string | null; done: boolean; due_date: string | null }[]).map((a) => ({
    id: a.id, description: a.description, assigneeId: a.assignee_id,
    assigneeName: a.assignee_id ? names.get(a.assignee_id) ?? null : null, taskId: a.task_id, done: a.done, dueDate: a.due_date,
  }));

  return {
    id: mData.id, title: mData.title, type: mData.type, status: mData.status,
    organizerId: mData.organizer_id, organizerName: names.get(mData.organizer_id) ?? null,
    scheduledAt: mData.scheduled_at, durationMin: mData.duration_min,
    participantCount: participants.length, recurrence: mData.recurrence, isUpcoming: mData.scheduled_at >= new Date().toISOString(),
    agenda: agendaToText(mData.agenda), notes: mData.notes,
    participants, actionItems,
  };
}
