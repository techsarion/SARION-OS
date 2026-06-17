import { requirePermission } from '@/lib/auth';
import { getDepartments, getTeams } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { CreateAccountForm } from '@/components/people/create-account-form';

export const metadata = { title: 'Create account — Sarion Team OS' };

export default async function CreateAccountPage() {
  await requirePermission('user:create');
  const [departments, teams] = await Promise.all([getDepartments(), getTeams()]);
  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title="Create account" subtitle="Provision a team member with an email and password. They can change it after signing in." />
      <Card><CardContent>
        <CreateAccountForm
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          teams={teams.map((t) => ({ id: t.id, name: t.name, department_id: t.department_id }))}
        />
      </CardContent></Card>
    </div>
  );
}
