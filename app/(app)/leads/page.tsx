import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getLeads, getTeamProfiles, getLeadFilterOptions } from '@/lib/server/data/leads';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { LeadsWorkspace } from '@/components/leads/leads-workspace';

export const metadata = { title: 'Leads — Sarion Team OS' };

export default async function LeadsPage() {
  const user = await requirePermission('lead:read');
  const [leads, people, options] = await Promise.all([getLeads(), getTeamProfiles(), getLeadFilterOptions()]);

  return (
    <div className="mx-auto max-w-[1320px] fade-up">
      <PageHeader title="Leads" subtitle="The team's outbound pipeline — research to customer.">
        {can(user.role, 'lead:import') && (
          <Link href="/leads/import" className={buttonVariants({ variant: 'secondary', size: 'md' })}>
            <Upload className="h-4 w-4" /> Import
          </Link>
        )}
        {can(user.role, 'lead:create') && (
          <Link href="/leads/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            <Plus className="h-4 w-4" /> New lead
          </Link>
        )}
      </PageHeader>

      <LeadsWorkspace
        leads={leads}
        people={people}
        options={options}
        canAssign={can(user.role, 'lead:assign')}
        canDelete={can(user.role, 'lead:delete')}
      />
    </div>
  );
}
