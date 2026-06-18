import { requireUser } from '@/lib/auth';
import { getTimeline } from '@/lib/server/data/timeline';
import { PageHeader } from '@/components/page-header';
import { TimelineView } from '@/components/timeline/timeline-view';

export default async function TimelinePage() {
  await requireUser();
  const days = await getTimeline();
  return (
    <div className="mx-auto max-w-[820px]">
      <PageHeader title="Work Timeline" subtitle="A chronological view of everything getting done" />
      <TimelineView days={days} />
    </div>
  );
}
