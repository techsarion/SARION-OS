'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, ShieldCheck, Lock, Activity, Sparkles, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { signIn } from '@/lib/actions/auth';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const FEATURES = [
  { icon: Activity, title: 'Unified work execution', body: 'Tasks, projects, meetings, and approvals in one accountable system.' },
  { icon: Sparkles, title: 'AI that drives outcomes', body: 'Risk detection, MOM generation, and executive summaries on demand.' },
  { icon: ShieldCheck, title: 'Enterprise governance', body: 'Role-based access, full audit trail, and row-level security by default.' },
];

const SECURITY = ['SOC 2-ready controls', 'MFA & SSO', 'Row-level security', 'End-to-end encryption'];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, null as { error?: string } | null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ── Left: brand / product panel ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface-2 p-10 lg:flex xl:p-14">
        {/* subtle brand ambience — no flashy gradients */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            background:
              'radial-gradient(560px 420px at 18% 12%, rgba(47,128,247,0.16), transparent 60%), radial-gradient(540px 460px at 88% 96%, rgba(31,200,230,0.12), transparent 60%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(circle at 30% 30%, black, transparent 75%)',
          }}
        />

        <div className="relative">
          <Logo size={32} />
        </div>

        <div className="relative max-w-md">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-text">
            Work smarter.
            <br />
            <span className="brand-text">Achieve more.</span>
          </h1>
          <p className="mt-3 text-body text-text-secondary">
            Sarion Team OS is the enterprise operating system that turns company-wide work,
            meetings, and goals into measurable execution.
          </p>

          <div className="mt-9 space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-border bg-card text-accent">
                  <f.icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-body-sm font-medium text-text">{f.title}</p>
                  <p className="text-caption leading-snug text-text-secondary">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {SECURITY.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-caption text-text-muted">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {s}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right: login form ── */}
      <div className="relative flex flex-col bg-bg">
        {/* mobile brand */}
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Image src="/SARION-ICON.png" alt="Sarion" width={28} height={28} priority />
          <span className="text-caption text-text-muted">Enterprise sign in</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-[380px]">
            <div className="mb-7">
              <p className="mb-1.5 text-overline uppercase tracking-wide text-accent">
                Internal Team Operations Platform
              </p>
              <h2 className="text-h1">Sign in to Sarion Team OS</h2>
              <p className="mt-1.5 text-body-sm text-text-secondary">
                Use your work account to continue to the workspace.
              </p>
            </div>

            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="/forgot-password" className="text-caption text-accent transition-colors hover:text-accent-hover">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label htmlFor="remember" className="flex cursor-pointer select-none items-center gap-2 text-body-sm text-text-secondary">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border-border-strong bg-surface-2 text-accent accent-accent"
                />
                Keep me signed in on this device
              </label>

              {state?.error && (
                <div className="flex items-center gap-2 rounded-sm border border-danger/30 bg-danger-soft px-3 py-2 text-caption text-danger">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  {state.error}
                </div>
              )}

              <Button type="submit" size="lg" disabled={pending} className="w-full">
                {pending ? 'Signing in…' : (
                  <>
                    Sign in <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Secure access notice */}
            <div className="mt-6 flex items-start gap-2.5 rounded-sm border border-border bg-surface-2 px-3.5 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <p className="text-caption leading-snug text-text-muted">
                <span className="font-medium text-text-secondary">Secure internal access.</span>{' '}
                This is a private Sarion system for authorised team members only. All
                sign-ins are logged and monitored. Never share your credentials.
              </p>
            </div>

            <p className="mt-8 text-center text-caption text-text-muted">
              Trouble signing in? Contact your administrator.
            </p>
          </div>
        </div>

        <footer className="flex items-center justify-center border-t border-border px-6 py-4 text-caption text-text-muted">
          <span>© {new Date().getFullYear()} Sarion Team OS · Internal use only</span>
        </footer>
      </div>
    </div>
  );
}
