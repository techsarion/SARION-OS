import 'server-only';
// Personal Dashboard data — one signed-in user's tasks, targets, meetings and
// recent activity. All live, RLS-scoped, no mock data.
import { createClient } from '@/lib/supabase/server';
import { getTasks, type TaskListItem } from '@/lib/server/data/tasks';
import { getMeetings, type MeetingListItem } from '@/lib/server/data/meetings';
import { getTargets } from '@/lib/server/data/targets';
import { phraseFor, hrefFor } from '@/lib/server/data/activity';
import { TargetPeriod, TargetScope } from '@/types/enums';
import type { TargetItem } from '@/lib/server/data/targets';

export interface MyActivityEntry { id: string; phrase: string; href: string | null; createdAt: string }

export interface PersonalDashboard {
  openTasks: TaskListItem[];
  overdueCount: number;
  completedCount: number;
  targets: { daily: TargetItem[]; weekly: TargetItem[]; monthly: TargetItem[] };
  meetings: MeetingListItem[];
  activity: MyActivityEntry[];
}

export async function getPersonalDashboard(userId: string): Promise<PersonalDashboard> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [tasks, allMeetings, daily, weekly, monthly, partRes, actRes] = await Promise.all([
    getTasks(),
    getMeetings(),
    getTargets(TargetPeriod.DAILY, TargetScope.PERSONAL),
    getTargets(TargetPeriod.WEEKLY, TargetScope.PERSONAL),
    getTargets(TargetPeriod.MONTHLY, TargetScope.PERSONAL),
    supabase.from('meeting_participants').select('meeting_id').eq('user_id', userId),
    supabase.from('audit_log').select('id, action, resource_type, resource_id, created_at').eq('actor_id', userId).order('created_at', { ascending: false }).limit(40),
  ]);

  const mine = tasks.filter((t) => t.assigneeId === userId);
  const openTasks = mine.filter((t) => t.status !== 'COMPLETED');
  const overdueCount = openTasks.filter((t) => t.isOverdue).length;
  const completedCount = mine.filter((t) => t.status === 'COMPLETED').length;

  const myMeetingIds = new Set(((partRes.data ?? []) as { meeting_id: string }[]).map((p) => p.meeting_id));
  const meetings = allMeetings
    .filter((m) => m.scheduledAt >= nowIso && (m.organizerId === userId || myMeetingIds.has(m.id)))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 5);

  const activity: MyActivityEntry[] = ((actRes.data ?? []) as { id: string; action: string; resource_type: string; resource_id: string | null; created_at: string }[])
    .map((r) => ({ id: r.id, phrase: phraseFor(r.action), href: hrefFor(r.resource_type, r.resource_id), createdAt: r.created_at }))
    .filter((e): e is MyActivityEntry => e.phrase !== null)
    .slice(0, 12);

  return {
    openTasks,
    overdueCount,
    completedCount,
    targets: {
      daily: daily.filter((t) => t.ownerId === userId),
      weekly: weekly.filter((t) => t.ownerId === userId),
      monthly: monthly.filter((t) => t.ownerId === userId),
    },
    meetings,
    activity,
  };
}
