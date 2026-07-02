import 'server-only';
// Read layer for the Daily Execution Workspace. One entry point,
// `getDailyWorkspaceData(userId)`, fans out (in parallel) to load:
//   • the user's workspace row for today (focus / priorities / blockers / notes)
//   • their editable to-do rows (manual + carried-over)
//   • auto-surfaced read-only items due today (tasks, lead follow-ups,
//     meeting actions, daily targets) — the "everything due today appears
//     automatically" requirement
//   • live progress notes, smart insights, the team-today board, and the streak.
// RLS is all-authenticated, so team-wide reads are permitted by design.
import { createClient } from '@/lib/supabase/server';
import { DailyTaskState } from '@/types/enums';
import type { DailyTaskState as StateT, DailyTaskSource as SourceT } from '@/types/enums';
import { isDone } from '@/lib/daily/constants';

const todayISO = () => new Date().toISOString().slice(0, 10);

export interface WsTask {
  id: string;
  title: string;
  state: StateT;
  priority: string;
  category: string | null;
  dueTime: string | null;
  estimatedMinutes: number | null;
  sortOrder: number;
  source: SourceT;
  sourceRef: string | null;
  carriedFromDate: string | null;
  completedAt: string | null;
}
export interface AutoItem {
  id: string;
  source: SourceT;
  title: string;
  sublabel: string;
  href: string;
  overdue: boolean;
}
export interface DailyNote { id: string; body: string; createdAt: string }
export interface TeammateToday {
  userId: string; name: string; role: string; focus: string | null;
  total: number; completed: number; remaining: number; percent: number; finished: boolean;
}
export interface Insights {
  overdue: number; carriedOver: number; followupsToday: number;
  nextMeeting: { title: string; at: string } | null;
}
export interface WorkspaceRow {
  id: string; focus: string | null; priorities: string[]; blockers: string | null;
  progress: string | null; finishedAt: string | null;
  eodWentWell: string | null; eodBlockers: string | null; eodTomorrow: string | null;
}
export interface WorkspaceData {
  date: string;
  workspace: WorkspaceRow | null;
  tasks: WsTask[];
  autoItems: AutoItem[];
  notes: DailyNote[];
  team: TeammateToday[];
  insights: Insights;
  streak: number;
  finishSummary: { meetingsCompleted: number; targetsCompleted: number };
}

// ── row shapes (the pinned supabase client degrades inferred selects) ─────────
type WsRow = {
  id: string; focus: string | null; priorities: string[] | null; blockers: string | null;
  progress: string | null; finished_at: string | null; eod_went_well: string | null;
  eod_blockers: string | null; eod_tomorrow: string | null; user_id: string;
};
type WsTaskRow = {
  id: string; title: string; state: StateT; priority: string; category: string | null;
  due_time: string | null; estimated_minutes: number | null; sort_order: number;
  source: SourceT; source_ref: string | null; carried_from_date: string | null;
  completed_at: string | null; user_id: string;
};

function mapTask(r: WsTaskRow): WsTask {
  return {
    id: r.id, title: r.title, state: r.state, priority: r.priority, category: r.category,
    dueTime: r.due_time, estimatedMinutes: r.estimated_minutes, sortOrder: r.sort_order,
    source: r.source, sourceRef: r.source_ref, carriedFromDate: r.carried_from_date,
    completedAt: r.completed_at,
  };
}
function mapWs(r: WsRow): WorkspaceRow {
  return {
    id: r.id, focus: r.focus, priorities: r.priorities ?? [], blockers: r.blockers,
    progress: r.progress, finishedAt: r.finished_at, eodWentWell: r.eod_went_well,
    eodBlockers: r.eod_blockers, eodTomorrow: r.eod_tomorrow,
  };
}

/** Everything the workspace page needs for one user on one day. */
export async function getDailyWorkspaceData(userId: string, date = todayISO()): Promise<WorkspaceData> {
  const supabase = await createClient();

  const [wsRes, taskRes, notesRes, autoItems, team, insights, streak, finishSummary] = await Promise.all([
    supabase.from('daily_workspaces')
      .select('id, focus, priorities, blockers, progress, finished_at, eod_went_well, eod_blockers, eod_tomorrow, user_id')
      .eq('user_id', userId).eq('work_date', date).maybeSingle<WsRow>(),
    supabase.from('daily_workspace_tasks')
      .select('id, title, state, priority, category, due_time, estimated_minutes, sort_order, source, source_ref, carried_from_date, completed_at, user_id')
      .eq('user_id', userId).eq('work_date', date).is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabase.from('daily_notes').select('id, body, created_at')
      .eq('user_id', userId).eq('work_date', date).order('created_at', { ascending: false }),
    getAutoItems(userId, date),
    getTeamToday(date),
    getInsights(userId, date),
    getStreak(userId, date),
    getFinishSummary(userId, date),
  ]);

  const workspace = wsRes.data ? mapWs(wsRes.data) : null;
  const tasks = ((taskRes.data ?? []) as WsTaskRow[]).map(mapTask);
  const notes = ((notesRes.data ?? []) as { id: string; body: string; created_at: string }[])
    .map((n) => ({ id: n.id, body: n.body, createdAt: n.created_at }));

  // Don't double-surface an auto item the user already pulled in as a real row.
  const usedRefs = new Set(tasks.map((t) => t.sourceRef).filter(Boolean) as string[]);
  const filteredAuto = autoItems.filter((a) => !usedRefs.has(a.id.split(':')[1] ?? ''));

  return { date, workspace, tasks, autoItems: filteredAuto, notes, team, insights, streak, finishSummary };
}

// ── auto-generated read-only items due today ─────────────────────────────────
async function getAutoItems(userId: string, date: string): Promise<AutoItem[]> {
  const supabase = await createClient();
  const items: AutoItem[] = [];

  const [tasksR, followupsR, actionsR, targetsR] = await Promise.all([
    supabase.from('tasks').select('id, title, due_date, status')
      .eq('assignee_id', userId).is('deleted_at', null).not('due_date', 'is', null).lte('due_date', date),
    supabase.from('lead_followups').select('id, type, due_date, lead_id, done')
      .eq('assigned_to', userId).eq('done', false).lte('due_date', date),
    supabase.from('meeting_action_items').select('id, description, due_date, done')
      .eq('assignee_id', userId).eq('done', false),
    supabase.from('targets').select('id, title, status, period, due_date')
      .eq('owner_id', userId).eq('period', 'DAILY').neq('status', 'COMPLETED'),
  ]);

  for (const t of (tasksR.data ?? []) as { id: string; title: string; due_date: string; status: string }[]) {
    if (t.status === 'COMPLETED') continue;
    items.push({ id: `TASK:${t.id}`, source: 'TASK', title: t.title, sublabel: 'Task due', href: `/tasks/${t.id}`, overdue: t.due_date < date });
  }
  // Lead agency names for follow-up labels.
  const followRows = (followupsR.data ?? []) as { id: string; type: string; due_date: string | null; lead_id: string; done: boolean }[];
  const leadIds = [...new Set(followRows.map((f) => f.lead_id))];
  const leadNames = new Map<string, string>();
  if (leadIds.length) {
    const { data: leads } = await supabase.from('leads').select('id, agency_name').in('id', leadIds);
    for (const l of (leads ?? []) as { id: string; agency_name: string }[]) leadNames.set(l.id, l.agency_name);
  }
  for (const f of followRows) {
    items.push({
      id: `LEAD_FOLLOWUP:${f.id}`, source: 'LEAD_FOLLOWUP',
      title: `${f.type.toLowerCase()} follow-up — ${leadNames.get(f.lead_id) ?? 'lead'}`,
      sublabel: 'Lead follow-up', href: `/leads/${f.lead_id}`, overdue: !!f.due_date && f.due_date < date,
    });
  }
  for (const a of (actionsR.data ?? []) as { id: string; description: string; due_date: string | null; done: boolean }[]) {
    // Only surface action items due today or overdue (or with no date at all).
    if (a.due_date && a.due_date > date) continue;
    items.push({ id: `MEETING_ACTION:${a.id}`, source: 'MEETING_ACTION', title: a.description, sublabel: 'Meeting action', href: '/actions', overdue: !!a.due_date && a.due_date < date });
  }
  for (const g of (targetsR.data ?? []) as { id: string; title: string; status: string; due_date: string | null }[]) {
    items.push({ id: `TARGET:${g.id}`, source: 'TARGET', title: g.title, sublabel: 'Daily target', href: '/daily-targets', overdue: !!g.due_date && g.due_date < date });
  }
  return items;
}

// ── team-today board ─────────────────────────────────────────────────────────
async function getTeamToday(date: string): Promise<TeammateToday[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: ws }, { data: tasks }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role'),
    supabase.from('daily_workspaces').select('user_id, focus, finished_at').eq('work_date', date),
    supabase.from('daily_workspace_tasks').select('user_id, state').eq('work_date', date).is('deleted_at', null),
  ]);
  const wsByUser = new Map<string, { focus: string | null; finished: boolean }>();
  for (const w of (ws ?? []) as { user_id: string; focus: string | null; finished_at: string | null }[])
    wsByUser.set(w.user_id, { focus: w.focus, finished: !!w.finished_at });
  const agg = new Map<string, { total: number; completed: number }>();
  for (const t of (tasks ?? []) as { user_id: string; state: StateT }[]) {
    const a = agg.get(t.user_id) ?? { total: 0, completed: 0 };
    a.total++; if (isDone(t.state)) a.completed++;
    agg.set(t.user_id, a);
  }
  return ((profiles ?? []) as { id: string; full_name: string; role: string }[])
    .map((p) => {
      const w = wsByUser.get(p.id);
      const a = agg.get(p.id) ?? { total: 0, completed: 0 };
      const percent = a.total ? Math.round((a.completed / a.total) * 100) : 0;
      return {
        userId: p.id, name: p.full_name, role: p.role, focus: w?.focus ?? null,
        total: a.total, completed: a.completed, remaining: a.total - a.completed, percent, finished: w?.finished ?? false,
      };
    })
    // Show people who have any workspace activity today first.
    .sort((x, y) => (y.total + (y.focus ? 1 : 0)) - (x.total + (x.focus ? 1 : 0)));
}

async function getInsights(userId: string, date: string): Promise<Insights> {
  const supabase = await createClient();
  const [tasksR, followsR, carriedR, meetingsR] = await Promise.all([
    supabase.from('tasks').select('id, due_date, status').eq('assignee_id', userId).is('deleted_at', null).not('due_date', 'is', null).lt('due_date', date),
    supabase.from('lead_followups').select('id').eq('assigned_to', userId).eq('done', false).lte('due_date', date),
    supabase.from('daily_workspace_tasks').select('id').eq('user_id', userId).eq('work_date', date).eq('source', 'CARRYOVER').is('deleted_at', null),
    supabase.from('meeting_participants').select('meeting_id').eq('user_id', userId),
  ]);
  const overdue = ((tasksR.data ?? []) as { status: string }[]).filter((t) => t.status !== 'COMPLETED').length;
  const followupsToday = (followsR.data ?? []).length;
  const carriedOver = (carriedR.data ?? []).length;

  let nextMeeting: Insights['nextMeeting'] = null;
  const meetingIds = ((meetingsR.data ?? []) as { meeting_id: string }[]).map((m) => m.meeting_id);
  if (meetingIds.length) {
    const nowIso = new Date().toISOString();
    const endOfDay = `${date}T23:59:59`;
    const { data: mtgs } = await supabase.from('meetings').select('title, scheduled_at')
      .in('id', meetingIds).gte('scheduled_at', nowIso).lte('scheduled_at', endOfDay)
      .order('scheduled_at', { ascending: true }).limit(1);
    const m = ((mtgs ?? []) as { title: string; scheduled_at: string }[])[0];
    if (m) nextMeeting = { title: m.title, at: m.scheduled_at };
  }
  return { overdue, carriedOver, followupsToday, nextMeeting };
}

async function getFinishSummary(userId: string, date: string) {
  const supabase = await createClient();
  const [{ data: mps }, { data: targets }] = await Promise.all([
    supabase.from('meeting_participants').select('meeting_id').eq('user_id', userId),
    supabase.from('targets').select('id').eq('owner_id', userId).eq('period', 'DAILY').eq('status', 'COMPLETED'),
  ]);
  let meetingsCompleted = 0;
  const ids = ((mps ?? []) as { meeting_id: string }[]).map((m) => m.meeting_id);
  if (ids.length) {
    const nowIso = new Date().toISOString();
    const { data: mtgs } = await supabase.from('meetings').select('id')
      .in('id', ids).gte('scheduled_at', `${date}T00:00:00`).lte('scheduled_at', nowIso);
    meetingsCompleted = (mtgs ?? []).length;
  }
  return { meetingsCompleted, targetsCompleted: (targets ?? []).length };
}

// Consecutive days (ending today) that have a workspace with tasks or a focus.
async function getStreak(userId: string, date: string): Promise<number> {
  const supabase = await createClient();
  const since = new Date(date);
  since.setDate(since.getDate() - 30);
  const { data } = await supabase.from('daily_workspaces')
    .select('work_date, finished_at, focus')
    .eq('user_id', userId).gte('work_date', since.toISOString().slice(0, 10))
    .order('work_date', { ascending: false });
  const active = new Set(((data ?? []) as { work_date: string; finished_at: string | null; focus: string | null }[])
    .filter((w) => w.finished_at || w.focus)
    .map((w) => w.work_date));
  let streak = 0;
  const cursor = new Date(date);
  const key = () => cursor.toISOString().slice(0, 10);
  // Today may still be in progress — if it isn't active yet, the streak is
  // measured from yesterday so it doesn't reset mid-morning.
  if (!active.has(key())) cursor.setDate(cursor.getDate() - 1);
  while (active.has(key())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
