import 'server-only';
// Team Pulse — a company-wide health snapshot: per-person progress, weekly &
// monthly completion, upcoming meetings, recent activity. All live data.
import { createClient } from '@/lib/supabase/server';
import { getTasks } from '@/lib/server/data/tasks';
import { getMeetings, type MeetingListItem } from '@/lib/server/data/meetings';
import { getTargetSummary } from '@/lib/server/data/targets';
import { phraseFor, hrefFor } from '@/lib/server/data/activity';
import { TargetPeriod } from '@/types/enums';

export interface MemberProgress {
  id: string;
  name: string;
  openTasks: number;
  completedTasks: number;
  completionPct: number; // completed / (open+completed)
}

export interface PulseActivity { id: string; actorName: string; phrase: string; href: string | null; createdAt: string }

export interface TeamPulse {
  teamProgress: MemberProgress[];
  weeklyCompletion: number; // avg progress across weekly targets
  monthlyCompletion: number; // avg progress across monthly targets
  weeklyCompletedTasks: number;
  upcomingMeetings: MeetingListItem[];
  recentActivity: PulseActivity[];
}

export async function getTeamPulse(): Promise<TeamPulse> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [tasks, meetings, weekly, monthly, peopleRes, completionRes, actRes] = await Promise.all([
    getTasks(),
    getMeetings(),
    getTargetSummary(TargetPeriod.WEEKLY),
    getTargetSummary(TargetPeriod.MONTHLY),
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.from('task_activity').select('verb, meta, created_at').eq('verb', 'status_changed').gte('created_at', weekAgo).limit(500),
    supabase.from('audit_log').select('id, actor_id, action, resource_type, resource_id, created_at').order('created_at', { ascending: false }).limit(40),
  ]);

  const people = (peopleRes.data ?? []) as { id: string; full_name: string }[];
  const names = new Map(people.map((p) => [p.id, p.full_name]));

  const teamProgress: MemberProgress[] = people.map((p) => {
    const mine = tasks.filter((t) => t.assigneeId === p.id);
    const open = mine.filter((t) => t.status !== 'COMPLETED').length;
    const completed = mine.filter((t) => t.status === 'COMPLETED').length;
    const denom = open + completed;
    return { id: p.id, name: p.full_name, openTasks: open, completedTasks: completed, completionPct: denom === 0 ? 0 : Math.round((completed / denom) * 100) };
  });

  const completions = (completionRes.data ?? []) as { meta: { to?: string } | null }[];
  const weeklyCompletedTasks = completions.filter((c) => c.meta?.to === 'COMPLETED').length;

  const upcomingMeetings = meetings.filter((m) => m.scheduledAt >= nowIso).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 5);

  const recentActivity: PulseActivity[] = ((actRes.data ?? []) as { id: string; actor_id: string | null; action: string; resource_type: string; resource_id: string | null; created_at: string }[])
    .map((r) => ({ id: r.id, actorName: r.actor_id ? names.get(r.actor_id) ?? 'Someone' : 'Someone', phrase: phraseFor(r.action), href: hrefFor(r.resource_type, r.resource_id), createdAt: r.created_at }))
    .filter((e): e is PulseActivity => e.phrase !== null)
    .slice(0, 12);

  return {
    teamProgress,
    weeklyCompletion: weekly.avgProgress,
    monthlyCompletion: monthly.avgProgress,
    weeklyCompletedTasks,
    upcomingMeetings,
    recentActivity,
  };
}
