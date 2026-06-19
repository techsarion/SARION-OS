import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Building2, Users, GitBranch } from 'lucide-react';
import { requirePermission, getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getEmployee, getDirectReports, getDepartments, getTeams, getProfilesLite } from '@/lib/server/data/org';
import { roleLabel } from '@/lib/roles';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/misc';
import { EmployeeAdminForm } from '@/components/people/employee-admin-form';
import { SelfProfileForm } from '@/components/people/self-profile-form';
import { ChangePasswordForm } from '@/components/people/change-password-form';

export const metadata = { title: 'Employee — Sarion Team OS' };

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success', ON_LEAVE: 'warning', RESIGNED: 'neutral', TERMINATED: 'danger',
};

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('user:read');
  const viewer = await getCurrentUser();
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  const isSelf = viewer?.id === employee.id;
  const canAdmin = viewer ? can(viewer.role, 'user:update') : false;
  const reports = await getDirectReports(employee.id);

  const [departments, teams, people] = canAdmin
    ? await Promise.all([getDepartments(), getTeams(), getProfilesLite()])
    : [[], [], []];

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <Link href="/employees" className="mb-3 inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to directory
      </Link>
      <PageHeader title={employee.full_name} subtitle={employee.designation ?? roleLabel(employee.role as never)} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* Identity card */}
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={employee.full_name} src={employee.avatar_url} size={56} />
              <div className="min-w-0">
                <p className="truncate text-h3 text-text">{employee.full_name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="accent">{roleLabel(employee.role as never)}</Badge>
                  <Badge tone={STATUS_TONE[employee.status] ?? 'neutral'} dot>{employee.status.replace('_', ' ').toLowerCase()}</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2 border-t border-border pt-4 text-body-sm">
              <Row icon={Mail} value={employee.email} />
              {employee.phone && <Row icon={Phone} value={employee.phone} />}
              <Row icon={Building2} value={employee.departmentName ?? 'No department'} />
              <Row icon={Users} value={`Code ${employee.employee_code}`} />
              <Row icon={GitBranch} value={employee.managerName ? `Reports to ${employee.managerName}` : 'No manager'} />
            </div>
            {employee.skills.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-overline uppercase text-text-muted">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {employee.skills.map((s) => <Badge key={s} tone="outline">{s}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit / reports */}
        <div className="space-y-4">
          {isSelf && (
            <>
              <Card>
                <CardHeader><CardTitle>Edit my profile</CardTitle></CardHeader>
                <CardContent>
                  <SelfProfileForm defaults={{ full_name: employee.full_name, phone: employee.phone, designation: employee.designation, skills: employee.skills }} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
                <CardContent>
                  <ChangePasswordForm />
                </CardContent>
              </Card>
            </>
          )}
          {canAdmin && !isSelf && (
            <Card>
              <CardHeader><CardTitle>Administration</CardTitle></CardHeader>
              <CardContent>
                <EmployeeAdminForm
                  employeeId={employee.id}
                  defaults={{ role: employee.role, status: employee.status, designation: employee.designation, department_id: employee.department_id, team_id: employee.team_id, manager_id: employee.manager_id }}
                  departments={departments.map((d) => ({ id: d.id, name: d.name }))}
                  teams={teams.map((t) => ({ id: t.id, name: t.name }))}
                  managers={people.filter((p) => p.id !== employee.id)}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Direct reports</CardTitle><Badge tone="neutral">{reports.length}</Badge></CardHeader>
            {reports.length === 0 ? (
              <CardContent><p className="text-body-sm text-text-muted">No direct reports.</p></CardContent>
            ) : (
              <div className="divide-y divide-border">
                {reports.map((r) => (
                  <Link key={r.id} href={`/employees/${r.id}`} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.02] sm:px-4">
                    <Avatar name={r.full_name} src={r.avatar_url} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-text">{r.full_name}</p>
                      <p className="truncate text-caption text-text-muted">{r.designation ?? roleLabel(r.role as never)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return (
    <p className="flex items-center gap-2.5 text-text-secondary">
      <Icon className="h-4 w-4 shrink-0 text-text-muted" /> {value}
    </p>
  );
}
