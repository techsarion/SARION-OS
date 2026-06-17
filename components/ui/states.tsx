import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared empty + loading state primitives — mirror the S app's "never show a
 * blank box" rule. Use EmptyState when a list has no rows, Skeleton while data
 * is loading.
 */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2.5 rounded-sm border border-dashed border-border bg-surface-2/40 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="grid h-10 w-10 place-items-center rounded-sm border border-border bg-card text-text-muted">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-body-sm font-medium text-text">{title}</p>
      {description && (
        <p className="max-w-sm text-caption leading-snug text-text-muted">{description}</p>
      )}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-sm bg-white/[0.06]', className)} />;
}

/** A few stacked skeleton rows for list/table placeholders. */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
