import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth';
import { getLeadDetail, getTeamProfiles } from '@/lib/server/data/leads';
import { PageHeader } from '@/components/page-header';
import { LeadForm } from '@/components/leads/lead-form';

export const metadata = { title: 'Edit Lead — Sarion Team OS' };

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('lead:update');
  const { id } = await params;
  const [detail, people] = await Promise.all([getLeadDetail(id), getTeamProfiles()]);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-[900px] fade-up">
      <PageHeader title={`Edit · ${detail.lead.agency_name}`} subtitle="Update company, founder, contact, and pipeline details." />
      <LeadForm lead={detail.lead as { id: string } & Record<string, unknown>} people={people} />
    </div>
  );
}
