import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth';
import { getDepartment, getProfilesLite } from '@/lib/server/data/org';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { DepartmentForm } from '@/components/org/department-form';

export const metadata = { title: 'Edit department — Sarion Team OS' };

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('dept:update');
  const { id } = await params;
  const [dept, heads] = await Promise.all([getDepartment(id), getProfilesLite()]);
  if (!dept) notFound();

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title={`Edit ${dept.name}`} subtitle="Update the department’s details and head." />
      <Card>
        <CardContent>
          <DepartmentForm
            mode="edit"
            departmentId={dept.id}
            defaults={{ name: dept.name, description: dept.description, head_id: dept.head_id }}
            heads={heads}
          />
        </CardContent>
      </Card>
    </div>
  );
}
