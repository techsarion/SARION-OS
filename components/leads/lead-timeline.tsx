import { EmptyState } from '@/components/ui/states';
import { History } from 'lucide-react';
import { timeAgo, verbLabel } from '@/lib/leads/format';

interface Activity { id: string; verb: string; meta: unknown; created_at: string; actorName: string | null }

/** Chronological lead timeline (newest first). Pure render — server-safe. */
export function LeadTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Every status change, note, and outreach step will appear here." />;
  }
  return (
    <ol className="relative space-y-3 pl-5">
      <span className="absolute left-[5px] top-1 bottom-1 w-px bg-border" aria-hidden />
      {activities.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[15px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" aria-hidden />
          <p className="text-body-sm text-text">{verbLabel(a.verb, a.meta)}</p>
          <p className="text-caption text-text-muted">{a.actorName ?? 'System'} · {timeAgo(a.created_at)}</p>
        </li>
      ))}
    </ol>
  );
}
