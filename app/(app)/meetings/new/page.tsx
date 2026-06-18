import { requireUser } from '@/lib/auth';
import { getPeople } from '@/lib/server/data/people';
import { PageHeader } from '@/components/page-header';
import { MeetingForm } from '@/components/meetings/meeting-form';

export default async function NewMeetingPage() {
  const user = await requireUser();
  const people = await getPeople();
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader title="New meeting" subtitle="Schedule a standup, review or strategy session" />
      <MeetingForm people={people.map((p) => ({ id: p.id, full_name: p.full_name }))} currentUserId={user.id} />
    </div>
  );
}
