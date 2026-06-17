'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { createAccount } from '@/lib/actions/accounts';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FieldError } from '@/components/ui/textarea';
import { ROLE_LABEL } from '@/lib/roles';
import { Role } from '@/types/enums';

const ASSIGNABLE = [Role.MANAGING_DIRECTOR, Role.DEPARTMENT_HEAD, Role.TEAM_LEAD, Role.MARKETING_OFFICER, Role.EMPLOYEE, Role.GUEST];

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
}

export function CreateAccountForm({
  departments,
  teams,
}: {
  departments: { id: string; name: string }[];
  teams: { id: string; name: string; department_id: string }[];
}) {
  const [state, formAction, pending] = useActionState(createAccount, null);
  const [dept, setDept] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(true);
  const router = useRouter();

  const deptTeams = useMemo(() => teams.filter((t) => t.department_id === dept), [teams, dept]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) { toast.success('Account created — credentials emailed'); router.push('/employees'); }
    else if (!state.fieldErrors) toast.error(state.error);
  }, [state, router]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" placeholder="Jordan Lee" required />
          <FieldError messages={fe?.full_name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" placeholder="jordan@company.com" required />
          <FieldError messages={fe?.email} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              id="password"
              name="password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
              className="pr-9 font-mono"
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide' : 'Show'} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button type="button" variant="secondary" size="md" onClick={() => { setPassword(generatePassword()); setShow(true); }}>
            <RefreshCw className="h-4 w-4" /> Generate
          </Button>
        </div>
        <FieldError messages={fe?.password} />
        <p className="text-caption text-text-muted">Share this with the member securely. They can change it themselves after signing in.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <Select id="role" name="role" defaultValue={Role.EMPLOYEE} required>
          {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
        <FieldError messages={fe?.role} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="department_id">Department</Label>
          <Select id="department_id" name="department_id" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">— None —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team_id">Team</Label>
          <Select id="team_id" name="team_id" disabled={!dept}>
            <option value="">— None —</option>
            {deptTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
      </div>

      {state && !state.ok && !state.fieldErrors && <p className="text-caption text-danger">{state.error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending}>{pending ? 'Creating…' : (<><UserPlus className="h-4 w-4" /> Create account</>)}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/employees')}>Cancel</Button>
      </div>
    </form>
  );
}
