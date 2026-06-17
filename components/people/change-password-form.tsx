'use client';

import { useActionState, useEffect, useRef } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '@/lib/actions/accounts';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { FieldError } from '@/components/ui/textarea';

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) { toast.success('Password changed'); ref.current?.reset(); }
    else if (!state.fieldErrors) toast.error(state.error);
  }, [state]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form ref={ref} action={formAction} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current_password">Current password</Label>
        <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required />
        <FieldError messages={fe?.current_password} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new_password">New password</Label>
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required />
        <FieldError messages={fe?.new_password} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm_password">Confirm new password</Label>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
        <FieldError messages={fe?.confirm_password} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Updating…' : (<><KeyRound className="h-4 w-4" /> Change password</>)}</Button>
    </form>
  );
}
