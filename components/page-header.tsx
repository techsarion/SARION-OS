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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-h1">{title}</h1>
        {subtitle && <p className="mt-1 text-body-sm text-text-secondary">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
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
