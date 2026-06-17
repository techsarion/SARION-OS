import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth';
import { getTeam, getDepartments, getProfilesLite } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { TeamForm } from '@/components/org/team-form';

export const metadata = { title: 'Edit team — Sarion Team OS' };

export default async function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('team:update');
  const { id } = await params;
  const [team, departments, leads] = await Promise.all([getTeam(id), getDepartments(), getProfilesLite()]);
  if (!team) notFound();

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title={`Edit ${team.name}`} subtitle="Update the team’s details and lead." />
      <Card><CardContent>
        <TeamForm
          mode="edit"
          teamId={team.id}
          defaults={{ name: team.name, description: team.description, department_id: team.department_id, lead_id: team.lead_id }}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          leads={leads}
        />
      </CardContent></Card>
    </div>
  );
}
