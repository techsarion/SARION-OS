import 'server-only';
// Team Capacity — per-person load: open tasks, overdue tasks, and weekly target
// progress. Live data, used by the Team Capacity widget on the dashboard & pulse.
import { getTasks } from '@/lib/server/data/tasks';
import { getTargets } from '@/lib/server/data/targets';
import { createClient } from '@/lib/supabase/server';
import { TargetPeriod, TargetScope } from '@/types/enums';

export interface CapacityRow {
  id: string;
  name: string;
  openTasks: number;
  overdueTasks: number;
  weeklyProgress: number; // avg % across their weekly targets (0 if none)
}

export async function getTeamCapacity(): Promise<CapacityRow[]> {
  const supabase = await createClient();
  const [tasks, weeklyTargets, peopleRes] = await Promise.all([
    getTasks(),
    getTargets(TargetPeriod.WEEKLY, TargetScope.PERSONAL),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ]);
  const people = (peopleRes.data ?? []) as { id: string; full_name: string }[];

  return people.map((p) => {
    const mine = tasks.filter((t) => t.assigneeId === p.id && t.status !== 'COMPLETED');
    const myTargets = weeklyTargets.filter((t) => t.ownerId === p.id);
    const weeklyProgress = myTargets.length === 0 ? 0
      : Math.round(myTargets.reduce((s, t) => s + t.progress, 0) / myTargets.length);
    return {
      id: p.id,
      name: p.full_name,
      openTasks: mine.length,
      overdueTasks: mine.filter((t) => t.isOverdue).length,
      weeklyProgress,
    };
  });
}
