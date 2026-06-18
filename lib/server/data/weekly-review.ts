import 'server-only';
// Read layer for Weekly Reviews. Combines a saved review (summary, completion %,
// carry-forward notes) with live context: the user's weekly targets and their
// open/overdue tasks that are natural carry-forward candidates.
import { createClient } from '@/lib/supabase/server';
import { getTasks } from '@/lib/server/data/tasks';
import { getTargets } from '@/lib/server/data/targets';
import { TargetPeriod, TargetScope } from '@/types/enums';
import type { TargetItem } from '@/lib/server/data/targets';
import type { TaskListItem } from '@/lib/server/data/tasks';

/** Monday (ISO week start) for a given date, as YYYY-MM-DD. */
export function weekStartISO(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export interface SavedReview {
  id: string;
  userId: string;
  userName: string | null;
  weekStart: string;
  completionPct: number;
  summary: string | null;
  carryForward: string | null;
  updatedAt: string;
}

export interface WeeklyReviewContext {
  weekStart: string;
  review: SavedReview | null;
  weeklyTargets: TargetItem[];
  targetCompletion: number; // computed % across this user's weekly targets
  carryForwardTasks: TaskListItem[]; // open tasks that should roll over
}

type ReviewSelect = {
  id: string; user_id: string; week_start: string; completion_pct: number;
  summary: string | null; carry_forward: string | null; updated_at: string;
};

async function nameMap(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name');
  return new Map(((data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
}

export async function getWeeklyReviewContext(userId: string, weekStart = weekStartISO()): Promise<WeeklyReviewContext> {
  const supabase = await createClient();
  const [{ data: reviewData }, allTargets, allTasks, names] = await Promise.all([
    supabase.from('weekly_reviews').select('id, user_id, week_start, completion_pct, summary, carry_forward, updated_at')
      .eq('user_id', userId).eq('week_start', weekStart).maybeSingle<ReviewSelect>(),
    getTargets(TargetPeriod.WEEKLY, TargetScope.PERSONAL),
    getTasks(),
    nameMap(),
  ]);

  const weeklyTargets = allTargets.filter((t) => t.ownerId === userId);
  const targetCompletion = weeklyTargets.length === 0 ? 0
    : Math.round(weeklyTargets.reduce((s, t) => s + t.progress, 0) / weeklyTargets.length);

  const carryForwardTasks = allTasks.filter((t) => t.assigneeId === userId && t.status !== 'COMPLETED');

  const review: SavedReview | null = reviewData
    ? {
        id: reviewData.id, userId: reviewData.user_id, userName: names.get(reviewData.user_id) ?? null,
        weekStart: reviewData.week_start, completionPct: reviewData.completion_pct,
        summary: reviewData.summary, carryForward: reviewData.carry_forward, updatedAt: reviewData.updated_at,
      }
    : null;

  return { weekStart, review, weeklyTargets, targetCompletion, carryForwardTasks };
}

/** All saved reviews for the current week (team view). */
export async function getTeamWeeklyReviews(weekStart = weekStartISO()): Promise<SavedReview[]> {
  const supabase = await createClient();
  const [{ data }, names] = await Promise.all([
    supabase.from('weekly_reviews').select('id, user_id, week_start, completion_pct, summary, carry_forward, updated_at')
      .eq('week_start', weekStart).order('updated_at', { ascending: false }),
    nameMap(),
  ]);
  return ((data ?? []) as ReviewSelect[]).map((r) => ({
    id: r.id, userId: r.user_id, userName: names.get(r.user_id) ?? null, weekStart: r.week_start,
    completionPct: r.completion_pct, summary: r.summary, carryForward: r.carry_forward, updatedAt: r.updated_at,
  }));
}
