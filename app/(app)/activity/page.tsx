import Link from 'next/link';
import { Activity as ActivityIcon } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getActivityFeed, type ActivityEntry, type ActivityGroups } from '@/lib/server/data/activity';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/ui/states';

function timeOf(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function ActivityPage() {
  await requireUser();
  const groups = await getActivityFeed();
  const total = groups.today.length + groups.thisWeek.length + groups.thisMonth.length + groups.earlier.length;

  const sections: { key: keyof ActivityGroups; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'earlier', label: 'Earlier' },
  ];

  return (
    <div className="mx-auto max-w-[820px]">
      <PageHeader title="Activity Feed" subtitle="Everything the team is getting done" />
      {total === 0 ? (
        <EmptyState icon={ActivityIcon} title="No activity yet" description="As the team creates tasks, runs meetings and hits targets, it shows up here." />
      ) : (
        <div className="space-y-6">
          {sections.map(({ key, label }) =>
            groups[key].length === 0 ? null : (
              <section key={key} className="space-y-2.5">
                <h2 className="text-overline uppercase text-text-secondary">{label}</h2>
                <ul className="space-y-1">
                  {groups[key].map((e) => <Row key={e.id} entry={e} />)}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Row({ entry }: { entry: ActivityEntry }) {
  const content = (
    <div className="flex items-start gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-white/[0.03]">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <p className="text-body-sm leading-snug text-text-secondary">
        <span className="font-medium text-text">{entry.actorName}</span> {entry.phrase}
        <span className="ml-1.5 text-caption text-text-muted">· {timeOf(entry.createdAt)}</span>
      </p>
    </div>
  );
  return <li>{entry.href ? <Link href={entry.href}>{content}</Link> : content}</li>;
}
