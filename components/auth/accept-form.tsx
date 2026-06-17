'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { CheckCircle2, UserCheck } from 'lucide-react';
import { acceptInvitation } from '@/lib/actions/invitations';
import { AuthCard } from '@/components/auth/auth-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { FieldError } from '@/components/ui/textarea';

export function AcceptForm({ token, email, fullName, role }: { token: string; email: string; fullName: string; role: string }) {
  const [state, formAction, pending] = useActionState(acceptInvitation, null);

  if (state?.ok) {
    return (
      <AuthCard eyebrow="Sarion Team OS" title="You're all set" subtitle="Your account is ready. Sign in to enter the workspace.">
        <div className="flex items-start gap-2.5 rounded-sm border border-success/30 bg-success-soft px-3.5 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="text-caption leading-snug text-text-secondary">Account created for {email}.</p>
        </div>
        <Link href="/login" className={`${buttonVariants({ variant: 'primary', size: 'lg' })} mt-5 w-full`}>
          Continue to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow={`Joining as ${role}`} title="Accept your invitation" subtitle={`Set up your account for ${email}.`}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" defaultValue={fullName} autoComplete="name" required />
          <FieldError messages={state && !state.ok ? state.fieldErrors?.full_name : undefined} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Create a password</Label>
          <Input id="password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
          <FieldError messages={state && !state.ok ? state.fieldErrors?.password : undefined} />
        </div>
        {state && !state.ok && !state.fieldErrors && <p className="text-caption text-danger">{state.error}</p>}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? 'Setting up…' : (<><UserCheck className="h-4 w-4" /> Accept & create account</>)}
        </Button>
      </form>
    </AuthCard>
  );
}
