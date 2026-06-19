import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

/** Shared list/detail page header — title, optional subtitle, optional CTA link. */
export function PageHeader({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-h1">{title}</h1>
        {subtitle && <p className="mt-1 text-body-sm text-text-secondary">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 max-sm:[&_a]:flex-1 max-sm:[&_button]:flex-1">
        {children}
        {action && (
          <Link href={action.href} className={buttonVariants({ variant: 'primary', size: 'md' })}>
            <Plus className="h-4 w-4" /> {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
