import { requirePermission } from '@/lib/auth';
import { getProfilesLite } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { DepartmentForm } from '@/components/org/department-form';

export const metadata = { title: 'New department — Sarion Team OS' };

export default async function NewDepartmentPage() {
  await requirePermission('dept:create');
  const heads = await getProfilesLite();
  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title="New department" subtitle="Create an organisational unit and assign its head." />
      <Card><CardContent><DepartmentForm mode="create" heads={heads} /></CardContent></Card>
    </div>
  );
}
