import 'server-only';
// Work Timeline — a chronological, categorised activity stream across Tasks,
// Meetings, Targets and Reviews. Built on the existing audit_log + activity
// phrase architecture; grouped into calendar days for the /timeline page.
import { createClient } from '@/lib/supabase/server';
import { phraseFor, hrefFor } from '@/lib/server/data/activity';

export type TimelineCategory = 'task' | 'meeting' | 'target' | 'review' | 'checkin';

export interface TimelineEntry {
  id: string;
  actorName: string;
  phrase: string;
  category: TimelineCategory;
  href: string | null;
  createdAt: string;
}

export interface TimelineDay {
  label: string; // "Today" | "Yesterday" | "Mon, Jun 16"
  entries: TimelineEntry[];
}

function categoryOf(action: string): TimelineCategory {
  if (action.startsWith('task')) return 'task';
  if (action.startsWith('meeting')) return 'meeting';
  if (action.startsWith('target')) return 'target';
  if (action.startsWith('review')) return 'review';
  return 'checkin'; // checkin.save / eod.save
}

function dayLabel(iso: string): string {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export async function getTimeline(limit = 250): Promise<TimelineDay[]> {
  const supabase = await createClient();
  const [{ data: logs }, { data: people }] = await Promise.all([
    supabase.from('audit_log').select('id, actor_id, action, resource_type, resource_id, created_at').order('created_at', { ascending: false }).limit(limit),
    supabase.from('profiles').select('id, full_name'),
  ]);
  const names = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const rows = (logs ?? []) as { id: string; actor_id: string | null; action: string; resource_type: string; resource_id: string | null; created_at: string }[];

  const entries: TimelineEntry[] = rows
    .map((r) => {
      const phrase = phraseFor(r.action);
      if (!phrase) return null;
      return {
        id: r.id,
        actorName: r.actor_id ? names.get(r.actor_id) ?? 'Someone' : 'Someone',
        phrase,
        category: categoryOf(r.action),
        href: hrefFor(r.resource_type, r.resource_id),
        createdAt: r.created_at,
      };
    })
    .filter((e): e is TimelineEntry => e !== null);

  // Group consecutive entries by calendar day (already sorted desc).
  const days: TimelineDay[] = [];
  for (const e of entries) {
    const label = dayLabel(e.createdAt);
    const last = days[days.length - 1];
    if (last && last.label === label) last.entries.push(e);
    else days.push({ label, entries: [e] });
  }
  return days;
}
