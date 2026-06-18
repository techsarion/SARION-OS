import * as React from 'react';
import { cn } from '@/lib/utils';

/** Hairline separator. */
export function Separator({
  className,
  orientation = 'horizontal',
}: {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  return (
    <div
      role="separator"
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  );
}

/** Loading skeleton with shimmer sweep. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-sm bg-white/[0.05]', className)} />;
}

/** Circular avatar — shows the uploaded photo when `src` is set, else initials.
 *  (Only place `rounded-full` is used.) */
export function Avatar({
  name,
  src,
  size = 28,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('inline-block shrink-0 rounded-full object-cover ring-1 ring-inset ring-white/10', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-grid place-items-center rounded-full bg-accent-soft font-semibold text-accent ring-1 ring-inset ring-accent/20',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}

/** Lightweight keycap for shortcut hints. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-sm border border-border-strong bg-surface px-1.5 font-mono text-[11px] text-text-secondary',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
