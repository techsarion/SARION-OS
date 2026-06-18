import Link from 'next/link';
import { CalendarClock, Users } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getMeetings } from '@/lib/server/data/meetings';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { MEETING_TYPE_META } from '@/lib/meetings/constants';

export default async function MeetingsPage() {
  await requireUser();
  const meetings = await getMeetings();
  const upcoming = meetings.filter((m) => m.isUpcoming).reverse();
  const past = meetings.filter((m) => !m.isUpcoming);

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader title="Meetings" subtitle="Standups, reviews and strategy sessions" action={{ href: '/meetings/new', label: 'New meeting' }} />

      {meetings.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No meetings yet" description="Schedule your first standup or review to start capturing notes and action items." />
      ) : (
        <div className="space-y-6">
          <Section title="Upcoming" meetings={upcoming} />
          <Section title="Past" meetings={past} />
        </div>
      )}
    </div>
  );
}

function Section({ title, meetings }: { title: string; meetings: Awaited<ReturnType<typeof getMeetings>> }) {
  if (meetings.length === 0) return null;
  return (
    <section className="space-y-2.5">
      <h2 className="text-overline uppercase text-text-secondary">{title}</h2>
      <div className="space-y-2">
        {meetings.map((m) => {
          const meta = MEETING_TYPE_META[m.type];
          const when = new Date(m.scheduledAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
          return (
            <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-4 py-3 transition-colors hover:border-accent/40">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-body-sm font-medium text-text">{m.title}</p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {m.recurrence !== 'NONE' && <Badge tone="outline">Repeats {m.recurrence.toLowerCase()}</Badge>}
                </div>
                <p className="mt-0.5 text-caption text-text-muted">{when} · {m.durationMin} min · {m.organizerName ?? 'Unknown'}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-caption text-text-muted">
                <Users className="h-3.5 w-3.5" /> {m.participantCount}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
