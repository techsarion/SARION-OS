import { requirePermission } from '@/lib/auth';
import { getTeamProfiles } from '@/lib/server/data/leads';
import { PageHeader } from '@/components/page-header';
import { LeadForm } from '@/components/leads/lead-form';

export const metadata = { title: 'New Lead — Sarion Team OS' };

export default async function NewLeadPage() {
  await requirePermission('lead:create');
  const people = await getTeamProfiles();
  return (
    <div className="mx-auto max-w-[900px] fade-up">
      <PageHeader title="New Lead" subtitle="Add a researched agency to the pipeline." />
      <LeadForm people={people} />
    </div>
  );
}
