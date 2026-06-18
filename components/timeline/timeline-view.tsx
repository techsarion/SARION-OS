'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckSquare, Calendar, Target, ClipboardCheck, Sunrise } from 'lucide-react';
import { EmptyState } from '@/components/ui/states';
import type { TimelineDay, TimelineCategory } from '@/lib/server/data/timeline';
import { cn } from '@/lib/utils';

const CAT_META: Record<TimelineCategory, { label: string; icon: typeof CheckSquare; color: string }> = {
  task: { label: 'Tasks', icon: CheckSquare, color: 'text-accent' },
  meeting: { label: 'Meetings', icon: Calendar, color: 'text-info' },
  target: { label: 'Targets', icon: Target, color: 'text-success' },
  review: { label: 'Reviews', icon: ClipboardCheck, color: 'text-warning' },
  checkin: { label: 'Check-ins', icon: Sunrise, color: 'text-text-secondary' },
};

const FILTERS: ('all' | TimelineCategory)[] = ['all', 'task', 'meeting', 'target', 'review', 'checkin'];

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function TimelineView({ days }: { days: TimelineDay[] }) {
  const [filter, setFilter] = useState<'all' | TimelineCategory>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return days;
    return days
      .map((d) => ({ ...d, entries: d.entries.filter((e) => e.category === filter) }))
      .filter((d) => d.entries.length > 0);
  }, [days, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 rounded-sm border border-border bg-surface-2 p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('rounded-sm px-3 py-1.5 text-body-sm transition-colors', filter === f ? 'bg-accent-soft text-text' : 'text-text-secondary hover:text-text')}
          >
            {f === 'all' ? 'All' : CAT_META[f].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here yet" description="Work across tasks, meetings, targets and reviews will appear on this timeline." />
      ) : (
        <div className="space-y-6">
          {filtered.map((day) => (
            <section key={day.label} className="space-y-2.5">
              <h2 className="text-overline uppercase text-text-secondary">{day.label}</h2>
              <ul className="relative space-y-1 border-l border-border pl-4">
                {day.entries.map((e) => {
                  const meta = CAT_META[e.category];
                  const Icon = meta.icon;
                  const inner = (
                    <div className="flex items-start gap-2.5 rounded-sm px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
                      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.color)} />
                      <p className="text-body-sm leading-snug text-text-secondary">
                        <span className="font-medium text-text">{e.actorName}</span> {e.phrase}
                        <span className="ml-1.5 text-caption text-text-muted">· {time(e.createdAt)}</span>
                      </p>
                    </div>
                  );
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[21px] top-2.5 h-1.5 w-1.5 rounded-full bg-border-strong" />
                      {e.href ? <Link href={e.href}>{inner}</Link> : inner}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
