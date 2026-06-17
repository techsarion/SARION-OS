import 'server-only';
// Real data for the app chrome: notifications (bell), nav badge counts, and the
// recent-activity feed. All derived from live tables (RLS-scoped) — no mock data.
import { createClient } from '@/lib/supabase/server';
import { getTasks, type TaskListItem } from '@/lib/server/data/tasks';

export interface NotificationItem {
  id: string;
  kind: 'overdue' | 'due_soon' | 'review';
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
  // Overdue first, then due-soon, then review.
  const order = { overdue: 0, due_soon: 1, review: 2 } as const;
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

/** One call for the layout — notifications, nav badge, and recent activity. */
export async function getChromeData(userId: string): Promise<ChromeData> {
  const tasks = await getTasks();
  const notifications = buildNotifications(tasks, userId);
  const myOpenTaskCount = tasks.filter((t) => t.assigneeId === userId && t.status !== 'COMPLETED').length;
  const recentActivity = await getRecentActivity(tasks);
  return { notifications, myOpenTaskCount, recentActivity };
}
