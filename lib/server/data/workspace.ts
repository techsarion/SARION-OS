import 'server-only';
// Real data for the app chrome: notifications (bell), nav badge counts, and the
// recent-activity feed. All derived from live tables (RLS-scoped) — no mock data.
import { createClient } from '@/lib/supabase/server';
import { getTasks, type TaskListItem } from '@/lib/server/data/tasks';
import { weekStartISO } from '@/lib/server/data/weekly-review';

export interface NotificationItem {
  id: string;
  kind: 'overdue' | 'due_soon' | 'review' | 'reminder';
  title: string;
  detail: string;
  href: string;
}

export interface ChromeData {
  notifications: NotificationItem[];
  myOpenTaskCount: number;
  recentActivity: ActivityFeedItem[];
}

export interface ActivityFeedItem {
  id: string;
  actorName: string | null;
  verb: string;
  taskTitle: string | null;
  taskId: string;
  createdAt: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
function inDays(n: number) { return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10); }

/** Notifications = the signed-in user's actionable tasks (real, from the tasks table). */
function buildNotifications(tasks: TaskListItem[], userId: string): NotificationItem[] {
  const mine = tasks.filter((t) => t.assigneeId === userId && t.status !== 'COMPLETED');
  const soon = inDays(3);
  const items: NotificationItem[] = [];
  for (const t of mine) {
    if (t.isOverdue) {
      items.push({ id: t.id, kind: 'overdue', title: t.title, detail: `Overdue · was due ${t.due_date}`, href: `/tasks/${t.id}` });
    } else if (t.due_date && t.due_date <= soon && t.due_date >= todayISO()) {
      items.push({ id: t.id, kind: 'due_soon', title: t.title, detail: `Due ${t.due_date}`, href: `/tasks/${t.id}` });
    } else if (t.status === 'REVIEW') {
      items.push({ id: t.id, kind: 'review', title: t.title, detail: 'In review', href: `/tasks/${t.id}` });
    }
  }
  // Overdue first, then due-soon, then review, then reminders.
  const order = { overdue: 0, due_soon: 1, review: 2, reminder: 3 } as const;
  return items.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 12);
}

async function getRecentActivity(tasks: TaskListItem[], limit = 10): Promise<ActivityFeedItem[]> {
  const supabase = await createClient();
  const [{ data: acts }, { data: people }] = await Promise.all([
    supabase.from('task_activity').select('id, task_id, actor_id, verb, created_at').order('created_at', { ascending: false }).limit(limit),
    supabase.from('profiles').select('id, full_name'),
  ]);
  const rows = (acts ?? []) as { id: string; task_id: string; actor_id: string | null; verb: string; created_at: string }[];
  const names = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const titles = new Map(tasks.map((t) => [t.id, t.title]));
  return rows.map((a) => ({
    id: a.id,
    actorName: a.actor_id ? names.get(a.actor_id) ?? null : null,
    verb: a.verb,
    taskTitle: titles.get(a.task_id) ?? null,
    taskId: a.task_id,
    createdAt: a.created_at,
  }));
}

/**
 * Daily-rhythm reminders, surfaced in the same notifications chrome. Purely
 * data-driven (presence of today's check-ins / this week's review) + the local
 * time of day — no background jobs needed.
 */
async function buildReminders(userId: string): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const today = todayISO();
  const week = weekStartISO();
  const hour = new Date().getHours();

  const [{ data: checkIns }, { data: review }] = await Promise.all([
    supabase.from('check_ins').select('kind').eq('user_id', userId).eq('entry_date', today),
    supabase.from('weekly_reviews').select('id').eq('user_id', userId).eq('week_start', week).maybeSingle<{ id: string }>(),
  ]);
  const kinds = new Set(((checkIns ?? []) as { kind: string }[]).map((c) => c.kind));
  const items: NotificationItem[] = [];

  // Morning check-in (before noon, if not yet done).
  if (hour < 12 && !kinds.has('MORNING')) {
    items.push({ id: 'rem-checkin', kind: 'reminder', title: 'Start your day with a check-in', detail: 'Set your focus and priorities', href: '/check-in' });
  }
  // End-of-day (from 4pm, if not yet done).
  if (hour >= 16 && !kinds.has('EOD')) {
    items.push({ id: 'rem-eod', kind: 'reminder', title: 'Log your end-of-day update', detail: "Wrap up what got done today", href: '/end-of-day' });
  }
  // Weekly review (Thursday → Sunday, if not yet done this week).
  const dow = new Date().getDay(); // 0 Sun … 6 Sat
  if ((dow === 0 || dow >= 4) && !review) {
    items.push({ id: 'rem-review', kind: 'reminder', title: 'Complete your weekly review', detail: 'Reflect on the week and plan carry-overs', href: '/weekly-review' });
  }
  return items;
}

/** One call for the layout — notifications, nav badge, and recent activity. */
export async function getChromeData(userId: string): Promise<ChromeData> {
  const [tasks, reminders] = await Promise.all([getTasks(), buildReminders(userId)]);
  const notifications = [...reminders, ...buildNotifications(tasks, userId)];
  const myOpenTaskCount = tasks.filter((t) => t.assigneeId === userId && t.status !== 'COMPLETED').length;
  const recentActivity = await getRecentActivity(tasks);
  return { notifications, myOpenTaskCount, recentActivity };
}
