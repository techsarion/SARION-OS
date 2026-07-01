import { requirePermission } from '@/lib/auth';
import { getLeadDashboard } from '@/lib/server/data/leads';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { LeadDashboard } from '@/components/leads/lead-dashboard';

export const metadata = { title: 'Lead Dashboard — Sarion Team OS' };

export default async function LeadDashboardPage() {
  await requirePermission('lead:read');
  const data = await getLeadDashboard();
  return (
    <div className="mx-auto max-w-[1320px] fade-up">
      <PageHeader title="Lead Dashboard" subtitle="Daily sales pulse — new leads, follow-ups, demos, and pipeline.">
        <Link href="/leads" className={buttonVariants({ variant: 'secondary', size: 'md' })}>All leads</Link>
      </PageHeader>
      <LeadDashboard data={data} />
    </div>
  );
}
