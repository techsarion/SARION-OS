import 'server-only';
// Unified startup dashboard — one focused execution view for the whole team.
// Sections: TODAY, THIS WEEK, THIS MONTH, UPCOMING. Everything is computed from
// live tables (tasks, meetings, targets, audit_log) — no mock data.
import { createClient } from '@/lib/supabase/server';
import { getTasks, type TaskListItem } from '@/lib/server/data/tasks';
import { getMeetings, type MeetingListItem } from '@/lib/server/data/meetings';
import { getTargetSummary } from '@/lib/server/data/targets';
import { TargetPeriod } from '@/types/enums';

const todayISO = () => new Date().toISOString().slice(0, 10);

export interface StartupDashboard {
  // TODAY
  dueToday: number;
  meetingsToday: number;
  completedToday: number;
  overdue: number;
  // THIS WEEK
  weeklyGoalProgress: number;
  teamActivity7d: number;
  completedThisWeek: number;
  tasksRemaining: number;
  // THIS MONTH
  monthlyGoalProgress: number;
  monthlyCompletionRate: number;
  teamPerformance: number;
  // UPCOMING
  upcomingMeetings: MeetingListItem[];
  upcomingDeadlines: { id: string; title: string; due: string }[];
  // MORNING
  todaysTasks: TaskListItem[];
  todaysMeetings: MeetingListItem[];
  checkedIn: boolean;
  eodDone: boolean;
  // greeting helpers
  myOpen: TaskListItem[];
}

export async function getStartupDashboard(userId: string): Promise<StartupDashboard> {
  const supabase = await createClient();
  const today = todayISO();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [tasks, meetings, weekly, monthly, completionRes, activityRes, checkInRes] = await Promise.all([
    getTasks(),
    getMeetings(),
    getTargetSummary(TargetPeriod.WEEKLY),
    getTargetSummary(TargetPeriod.MONTHLY),
    supabase.from('task_activity').select('verb, meta, created_at').eq('verb', 'status_changed').order('created_at', { ascending: false }).limit(500),
    supabase.from('audit_log').select('id, created_at').gte('created_at', weekAgo),
    supabase.from('check_ins').select('kind').eq('user_id', userId).eq('entry_date', today),
  ]);
  const checkInKinds = new Set(((checkInRes.data ?? []) as { kind: string }[]).map((c) => c.kind));

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const overdue = tasks.filter((t) => t.isOverdue).length;
  const open = tasks.filter((t) => t.status !== 'COMPLETED');

  const completions = (completionRes.data ?? []) as { meta: { to?: string } | null; created_at: string }[];
  const completedToday = completions.filter((c) => c.meta?.to === 'COMPLETED' && c.created_at.slice(0, 10) === today).length;
  const completedThisWeek = completions.filter((c) => c.meta?.to === 'COMPLETED' && c.created_at >= weekAgo).length;

  const nowIso = new Date().toISOString();
  const upcomingMeetings = meetings.filter((m) => m.scheduledAt >= nowIso).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 5);
  const meetingsToday = meetings.filter((m) => m.scheduledAt.slice(0, 10) === today).length;

  const upcomingDeadlines = open
    .filter((t) => t.due_date && t.due_date >= today)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .slice(0, 5)
    .map((t) => ({ id: t.id, title: t.title, due: t.due_date as string }));

  const monthlyCompletionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  const teamPerformance = total === 0 ? 100 : Math.round(((total - overdue) / total) * 100);

  return {
    dueToday: open.filter((t) => t.due_date === today).length,
    meetingsToday,
    completedToday,
    overdue,
    weeklyGoalProgress: weekly.avgProgress,
    teamActivity7d: ((activityRes.data ?? []) as unknown[]).length,
    completedThisWeek,
    tasksRemaining: open.length,
    monthlyGoalProgress: monthly.avgProgress,
    monthlyCompletionRate,
    teamPerformance,
    upcomingMeetings,
    upcomingDeadlines,
    todaysTasks: open.filter((t) => t.assigneeId === userId && t.due_date === today),
    todaysMeetings: meetings.filter((m) => m.scheduledAt.slice(0, 10) === today).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    checkedIn: checkInKinds.has('MORNING'),
    eodDone: checkInKinds.has('EOD'),
    myOpen: open.filter((t) => t.assigneeId === userId),
  };
}
