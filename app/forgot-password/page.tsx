'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { requestPasswordReset } from '@/lib/actions/password';
import { AuthCard } from '@/components/auth/auth-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  if (state?.ok) {
    return (
      <AuthCard eyebrow="Sarion Team OS" title="Check your inbox" subtitle="If that email belongs to a team member, a reset link is on its way.">
        <div className="flex items-start gap-2.5 rounded-sm border border-success/30 bg-success-soft px-3.5 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="text-caption leading-snug text-text-secondary">
            The link expires in 1 hour. Didn’t get it? Check spam, or ask an administrator to confirm your account.
          </p>
        </div>
        <Link href="/login" className={`${buttonVariants({ variant: 'secondary', size: 'lg' })} mt-5 w-full`}>
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Sarion Team OS"
      title="Reset your password"
      subtitle="Enter your work email and we’ll send a secure reset link."
      footer={<Link href="/login" className="text-accent hover:text-accent-hover">Back to sign in</Link>}
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        </div>
        {state && !state.ok && (
          <p className="text-caption text-danger">{state.error}</p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? 'Sending…' : (<><Mail className="h-4 w-4" /> Send reset link</>)}
        </Button>
      </form>
    </AuthCard>
  );
}
