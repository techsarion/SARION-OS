import 'server-only';
// Real dashboard metrics computed from live tables (tasks, task_activity,
// profiles, departments) — RLS-scoped to the caller. No mock data.
import { createClient } from '@/lib/supabase/server';
import { getTasks, type TaskListItem } from '@/lib/server/data/tasks';
import { getDepartments } from '@/lib/server/data/org';
import { STATUS_ORDER } from '@/lib/tasks/constants';
import type { TaskStatus as TaskStatusT } from '@/types/enums';

export interface SeriesPoint { name: string; value: number }

export interface DashboardMetrics {
  totalTasks: number;
  openTasks: number;
  overdueTasks: number;
  completedTasks: number;
  inReview: number;
  statusCounts: Record<TaskStatusT, number>;
  healthScore: number;
  completedLast7Days: SeriesPoint[];
  departmentLoad: SeriesPoint[];
  peopleCount: number;
  departmentCount: number;
  myOpen: TaskListItem[];
  myOverdue: number;
  myCompleted30: number;
  unassignedCount: number;
  reviewTasks: TaskListItem[];
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const [tasks, departments, peopleRes, completionRes] = await Promise.all([
    getTasks(),
    getDepartments(),
    supabase.from('profiles').select('id'),
    // Real completion events for the productivity series.
    supabase.from('task_activity').select('verb, meta, created_at').eq('verb', 'status_changed').order('created_at', { ascending: false }).limit(500),
  ]);

  const statusCounts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<TaskStatusT, number>;
  for (const t of tasks) statusCounts[t.status] += 1;

  const total = tasks.length;
  const completedTasks = statusCounts.COMPLETED;
  const overdueTasks = tasks.filter((t) => t.isOverdue).length;
  const openTasks = total - completedTasks;
  const onTrack = total - overdueTasks;
  const healthScore = total === 0 ? 100 : Math.round((onTrack / total) * 100);

  // Productivity: completions per day for the last 7 days (real events).
  const completions = (completionRes.data ?? []) as { meta: { to?: string } | null; created_at: string }[];
  const last7: SeriesPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const dayStr = d.toISOString().slice(0, 10);
    const count = completions.filter((c) => c.meta?.to === 'COMPLETED' && c.created_at.slice(0, 10) === dayStr).length;
    last7.push({ name: WEEKDAY[d.getDay()], value: count });
  }

  // Department load: open tasks per department (top 6 by load).
  const loadMap = new Map<string, number>();
  for (const t of tasks) {
    if (t.status === 'COMPLETED') continue;
    const name = t.departmentName ?? 'Unassigned';
    loadMap.set(name, (loadMap.get(name) ?? 0) + 1);
  }
  const departmentLoad = [...loadMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name: name.length > 6 ? name.slice(0, 6) : name, value }));

  const myTasks = tasks.filter((t) => t.assigneeId === userId);
  const myOpen = myTasks.filter((t) => t.status !== 'COMPLETED');
  const myOverdue = myOpen.filter((t) => t.isOverdue).length;
  const myCompleted30 = myTasks.filter((t) => t.status === 'COMPLETED').length;

  return {
    totalTasks: total,
    openTasks,
    overdueTasks,
    completedTasks,
    inReview: statusCounts.REVIEW,
    statusCounts,
    healthScore,
    completedLast7Days: last7,
    departmentLoad,
    peopleCount: ((peopleRes.data ?? []) as unknown[]).length,
    departmentCount: departments.length,
    myOpen,
    myOverdue,
    myCompleted30,
    unassignedCount: tasks.filter((t) => !t.assigneeId && t.status !== 'COMPLETED').length,
    reviewTasks: tasks.filter((t) => t.status === 'REVIEW'),
  };
}
