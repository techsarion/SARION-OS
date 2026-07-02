import { requirePermission } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { ImportWizard } from '@/components/leads/import-wizard';

export const metadata = { title: 'Import Leads — Sarion Team OS' };

export default async function ImportLeadsPage() {
  await requirePermission('lead:import');
  return (
    <div className="mx-auto max-w-[900px] fade-up">
      <PageHeader title="Import Leads" subtitle="Upload a CSV or Excel (.xlsx) file of researched agencies. We auto-map columns, validate rows, and flag duplicates before anything is saved." />
      <ImportWizard />
    </div>
  );
}
