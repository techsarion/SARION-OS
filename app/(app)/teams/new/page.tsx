import { requirePermission } from '@/lib/auth';
import { getDepartments, getProfilesLite } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { TeamForm } from '@/components/org/team-form';

export const metadata = { title: 'New team — Sarion Team OS' };

export default async function NewTeamPage() {
  await requirePermission('team:create');
  const [departments, leads] = await Promise.all([getDepartments(), getProfilesLite()]);
  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title="New team" subtitle="Create a team within a department and assign its lead." />
      <Card><CardContent>
        <TeamForm mode="create" departments={departments.map((d) => ({ id: d.id, name: d.name }))} leads={leads} />
      </CardContent></Card>
    </div>
  );
}
