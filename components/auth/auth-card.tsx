import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

/** Centered branded shell for the public auth flows (forgot/reset/accept).
 *  Mirrors the login aesthetic without duplicating its two-column layout. */
export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          background:
            'radial-gradient(560px 420px at 50% -10%, rgba(47,128,247,0.14), transparent 60%)',
        }}
      />
      <div className="relative w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <Logo size={30} />
        </div>
        <div className="rounded-sm border border-border bg-card p-7 shadow-e1">
          {eyebrow && (
            <p className="mb-1.5 text-overline uppercase tracking-wide text-accent">{eyebrow}</p>
          )}
          <h1 className="text-h1">{title}</h1>
          {subtitle && <p className="mt-1.5 text-body-sm text-text-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-caption text-text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          Secure internal access — authorised team members only.
        </div>
        {footer && <div className="mt-4 text-center text-caption text-text-muted">{footer}</div>}
      </div>
    </div>
  );
}
