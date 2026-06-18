import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getMeetingDetail } from '@/lib/server/data/meetings';
import { getPeople } from '@/lib/server/data/people';
import { MeetingDetailView } from '@/components/meetings/meeting-detail';

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [meeting, people] = await Promise.all([getMeetingDetail(id), getPeople()]);
  if (!meeting) notFound();
  return <MeetingDetailView meeting={meeting} people={people.map((p) => ({ id: p.id, full_name: p.full_name }))} />;
}
