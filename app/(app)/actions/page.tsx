import { requireUser } from '@/lib/auth';
import { getActionBuckets } from '@/lib/server/data/actions';
import { PageHeader } from '@/components/page-header';
import { ActionsTracker } from '@/components/actions/actions-tracker';

export default async function ActionsPage() {
  await requireUser();
  const buckets = await getActionBuckets();
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader title="Meeting Actions" subtitle="Track every follow-up from your meetings to done" />
      <ActionsTracker buckets={buckets} />
    </div>
  );
}
