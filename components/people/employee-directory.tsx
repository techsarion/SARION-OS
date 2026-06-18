'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/states';
import { ROLE_LABEL } from '@/lib/roles';
import type { Role } from '@/types/enums';
import type { EmployeeRow } from '@/lib/server/data/org';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success', ON_LEAVE: 'warning', RESIGNED: 'neutral', TERMINATED: 'danger',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', ON_LEAVE: 'On leave', RESIGNED: 'Resigned', TERMINATED: 'Terminated',
};

export function EmployeeDirectory({
  employees,
  departments,
}: {
  employees: EmployeeRow[];
  departments: { id: string; name: string }[];
}) {
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return employees.filter((e) => {
      if (dept && e.department_id !== dept) return false;
      if (role && e.role !== role) return false;
      if (status && e.status !== status) return false;
      if (!needle) return true;
      return (
        e.full_name.toLowerCase().includes(needle) ||
        e.email.toLowerCase().includes(needle) ||
        e.employee_code.toLowerCase().includes(needle)
      );
    });
  }, [employees, q, dept, role, status]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, or code…" className="pl-9" />
        </div>
        <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-auto min-w-[150px]">
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-auto min-w-[150px]">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-[130px]">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </Select>
      </div>

      <p className="text-caption text-text-muted">{filtered.length} of {employees.length} people</p>

      {filtered.length === 0 ? (
        <EmptyState icon={UserRound} title="No people match" description="Try clearing a filter or adjusting your search." />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={`/employees/${e.id}`}
              className="flex items-center gap-3 rounded-sm border border-border bg-card px-3.5 py-3 transition-colors hover:border-accent/40 hover:bg-white/[0.02]"
            >
              <Avatar name={e.full_name} src={e.avatar_url} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium text-text">{e.full_name}</p>
                <p className="truncate text-caption text-text-muted">{e.designation ?? ROLE_LABEL[e.role as Role]} · {e.departmentName ?? 'No department'}</p>
              </div>
              <Badge tone={STATUS_TONE[e.status] ?? 'neutral'} dot>{STATUS_LABEL[e.status] ?? e.status}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
