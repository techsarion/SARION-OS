import * as React from 'react';
import { cn } from '@/lib/utils';

/** Native select styled to match Input — dark enterprise, 2px radius. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full rounded-sm border border-border-strong bg-surface px-3 text-body text-text outline-none transition-colors duration-fast',
        'hover:border-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
