import 'server-only';
// Team-wide activity feed, built from the immutable audit_log (every meaningful
// mutation across tasks, meetings and targets is logged there). Grouped into
// Today / This Week / This Month for the /activity page.
import { createClient } from '@/lib/supabase/server';

export interface ActivityEntry {
  id: string;
  actorName: string;
  phrase: string; // e.g. "created a meeting", "completed a target"
  href: string | null;
  createdAt: string;
}

export interface ActivityGroups {
  today: ActivityEntry[];
  thisWeek: ActivityEntry[];
  thisMonth: ActivityEntry[];
  earlier: ActivityEntry[];
}

// Maps an audit action key to a human phrase + the route its resource lives on.
const ACTION_PHRASE: Record<string, string> = {
  'task.create': 'created a task',
  'task.update': 'updated a task',
  'task.delete': 'deleted a task',
  'task.assign': 'assigned a task',
  'task.reassign': 'reassigned a task',
  'task.transition': 'moved a task forward',
  'meeting.create': 'created a meeting',
  'meeting.minute': 'added meeting notes',
  'meeting.action_add': 'added a meeting action',
  'meeting.action_toggle': 'updated a meeting action',
  'meeting.action_to_task': 'turned an action item into a task',
  'meeting.delete': 'deleted a meeting',
  'target.create': 'set a new target',
  'target.status': 'updated a target',
  'target.progress': 'made progress on a target',
  'target.delete': 'removed a target',
  'checkin.save': 'posted a daily check-in',
  'eod.save': 'posted an end-of-day update',
  'review.save': 'saved a weekly review',
  // People & org administration
  'user.create_account': 'added a team member',
  'user.invite': 'invited a new member',
  'user.invite_revoke': 'revoked an invitation',
  'user.accept_invite': 'joined the team',
  'user.update': 'updated a team member',
  'user.self_update': 'updated their profile',
  'team.create': 'created a team',
  'team.update': 'updated a team',
  'team.delete': 'removed a team',
  'dept.create': 'created a department',
  'dept.update': 'updated a department',
  'dept.delete': 'removed a department',
};

/** Public: human phrase for an audit action key, or null if not feed-worthy. */
export function phraseFor(action: string): string | null {
  return ACTION_PHRASE[action] ?? null;
}

export function hrefFor(resourceType: string, resourceId: string | null): string | null {
  if (!resourceId) return null;
  if (resourceType === 'task') return `/tasks/${resourceId}`;
  if (resourceType === 'meeting') return `/meetings/${resourceId}`;
  return null;
}

export async function getActivityFeed(limit = 200): Promise<ActivityGroups> {
  const supabase = await createClient();
  const [{ data: logs }, { data: people }] = await Promise.all([
    supabase.from('audit_log').select('id, actor_id, action, resource_type, resource_id, created_at').order('created_at', { ascending: false }).limit(limit),
    supabase.from('profiles').select('id, full_name'),
  ]);
  const names = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const rows = (logs ?? []) as { id: string; actor_id: string | null; action: string; resource_type: string; resource_id: string | null; created_at: string }[];

  const entries: ActivityEntry[] = rows
    .filter((r) => ACTION_PHRASE[r.action])
    .map((r) => ({
      id: r.id,
      actorName: r.actor_id ? names.get(r.actor_id) ?? 'Someone' : 'Someone',
      phrase: ACTION_PHRASE[r.action],
      href: hrefFor(r.resource_type, r.resource_id),
      createdAt: r.created_at,
    }));

  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;

  const groups: ActivityGroups = { today: [], thisWeek: [], thisMonth: [], earlier: [] };
  for (const e of entries) {
    const t = new Date(e.createdAt).getTime();
    if (t >= startOfToday.getTime()) groups.today.push(e);
    else if (t >= weekAgo) groups.thisWeek.push(e);
    else if (t >= monthAgo) groups.thisMonth.push(e);
    else groups.earlier.push(e);
  }
  return groups;
}
