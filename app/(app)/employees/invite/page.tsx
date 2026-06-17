import { requirePermission } from '@/lib/auth';
import { getDepartments, getTeams } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { InviteForm } from '@/components/people/invite-form';

export const metadata = { title: 'Invite member — Sarion Team OS' };

export default async function InviteMemberPage() {
  await requirePermission('user:create');
  const [departments, teams] = await Promise.all([getDepartments(), getTeams()]);
  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title="Invite a member" subtitle="Send a branded invitation to join the workspace." />
      <Card><CardContent>
        <InviteForm
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          teams={teams.map((t) => ({ id: t.id, name: t.name, department_id: t.department_id }))}
        />
      </CardContent></Card>
    </div>
  );
}
