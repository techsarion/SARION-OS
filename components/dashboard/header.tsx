import * as React from 'react';
import { Badge } from '@/components/ui/badge';

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

/** Shared page header for every role dashboard — title, dated subtitle, status
 *  badge, and an optional real action. No placeholder buttons. */
export function DashboardHeader({
  title,
  subtitle,
  badge,
  action,
  icon,
}: {
  title: string;
  subtitle: string;
  badge?: { tone: Tone; label: string };
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2.5 text-h1">{icon}{title}</h1>
        <p className="mt-1 text-body-sm text-text-secondary">
          {subtitle} · {today}
        </p>
      </div>
      {(badge || action) && (
        <div className="flex items-center gap-2">
          {badge && (
            <Badge tone={badge.tone} dot>
              {badge.label}
            </Badge>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
