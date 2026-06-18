import 'server-only';
// Lightweight roster of active team members — used by target/meeting owner
// pickers and the Team Directory. RLS-scoped (the small team sees everyone).
import { createClient } from '@/lib/supabase/server';

export interface Person {
  id: string;
  full_name: string;
  email: string;
  role: string;
  designation: string | null;
  status: string;
  avatar_url: string | null;
}

export async function getPeople(): Promise<Person[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, designation, status, avatar_url')
    .order('full_name', { ascending: true });
  return (data ?? []) as Person[];
}

export interface DirectoryPerson extends Person {
  openTasks: number;
  activeTargets: number;
}

/** Team Directory rows — each person with their current open task + target load. */
export async function getDirectory(): Promise<DirectoryPerson[]> {
  const supabase = await createClient();
  const [people, taskRes, targetRes] = await Promise.all([
    getPeople(),
    supabase.from('tasks').select('assignee_id, status').is('deleted_at', null).neq('status', 'COMPLETED'),
    supabase.from('targets').select('owner_id, status').neq('status', 'COMPLETED'),
  ]);
  const tasks = (taskRes.data ?? []) as { assignee_id: string | null }[];
  const targets = (targetRes.data ?? []) as { owner_id: string }[];
  const taskCount = new Map<string, number>();
  for (const t of tasks) if (t.assignee_id) taskCount.set(t.assignee_id, (taskCount.get(t.assignee_id) ?? 0) + 1);
  const targetCount = new Map<string, number>();
  for (const t of targets) targetCount.set(t.owner_id, (targetCount.get(t.owner_id) ?? 0) + 1);
  return people.map((p) => ({
    ...p,
    openTasks: taskCount.get(p.id) ?? 0,
    activeTargets: targetCount.get(p.id) ?? 0,
  }));
}
