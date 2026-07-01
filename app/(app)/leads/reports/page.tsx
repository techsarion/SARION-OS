import { requirePermission } from '@/lib/auth';
import { getLeadReports } from '@/lib/server/data/leads';
import { PageHeader } from '@/components/page-header';
import { ReportsView } from '@/components/leads/reports-view';

export const metadata = { title: 'Sales Reports — Sarion Team OS' };

export default async function LeadReportsPage() {
  await requirePermission('lead:read');
  const data = await getLeadReports();
  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title="Sales Reports" subtitle="Weekly outreach activity and monthly conversion." />
      <ReportsView data={data} />
    </div>
  );
}
