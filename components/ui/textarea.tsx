import * as React from 'react';
import { cn } from '@/lib/utils';

/** Textarea styled to match Input — dark enterprise, 2px radius. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-body text-text outline-none transition-colors duration-fast placeholder:text-text-muted',
        'hover:border-text-muted focus:border-accent focus:ring-2 focus:ring-accent/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

/** Inline field error text (per-field, from ActionResult.fieldErrors). */
export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-caption text-danger">{messages[0]}</p>;
}
