'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { resetPassword } from '@/lib/actions/password';
import { AuthCard } from '@/components/auth/auth-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

function ResetForm() {
  const params = useSearchParams();
  const tokenHash = params.get('token_hash') ?? '';
  const [state, formAction, pending] = useActionState(resetPassword, null);

  if (!tokenHash) {
    return (
      <AuthCard eyebrow="Sarion Team OS" title="Invalid reset link" subtitle="This link is missing its security token or has expired.">
        <Link href="/forgot-password" className={`${buttonVariants({ variant: 'primary', size: 'lg' })} w-full`}>
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  if (state?.ok) {
    return (
      <AuthCard eyebrow="Sarion Team OS" title="Password updated" subtitle="You can now sign in with your new password.">
        <div className="flex items-start gap-2.5 rounded-sm border border-success/30 bg-success-soft px-3.5 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="text-caption leading-snug text-text-secondary">Your password was changed successfully.</p>
        </div>
        <Link href="/login" className={`${buttonVariants({ variant: 'primary', size: 'lg' })} mt-5 w-full`}>
          <ArrowLeft className="h-4 w-4" /> Continue to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Sarion Team OS" title="Set a new password" subtitle="Choose a strong password you don’t use elsewhere.">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
        </div>
        {state && !state.ok && <p className="text-caption text-danger">{state.error}</p>}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? 'Updating…' : (<><KeyRound className="h-4 w-4" /> Update password</>)}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
