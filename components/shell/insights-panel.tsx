import Link from 'next/link';
import { AlertTriangle, Clock, Inbox, Activity, CheckCircle2 } from 'lucide-react';
import type { NotificationItem, ActivityFeedItem } from '@/lib/server/data/workspace';

const ATT_ICON = { overdue: AlertTriangle, due_soon: Clock, review: Inbox } as const;
const ATT_TONE = { overdue: 'text-danger', due_soon: 'text-warning', review: 'text-accent' } as const;

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function InsightsPanel({
  notifications,
  recentActivity,
}: {
  notifications: NotificationItem[];
  recentActivity: ActivityFeedItem[];
}) {
  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-surface-2 p-4 xl:flex">
      {/* Needs attention — real, from your tasks */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h2 className="text-overline uppercase text-text-secondary">Needs attention</h2>
        </div>
        {notifications.length === 0 ? (
          <div className="flex items-center gap-2 rounded-sm border border-border bg-card p-3 text-caption text-text-muted">
            <CheckCircle2 className="h-4 w-4 text-success" /> Nothing needs your attention.
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 5).map((n) => {
              const Icon = ATT_ICON[n.kind];
              return (
                <Link key={`${n.kind}-${n.id}`} href={n.href} className="block rounded-sm border border-border bg-card p-3 transition-colors hover:border-accent/40">
                  <div className="flex items-start gap-2">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ATT_TONE[n.kind]}`} />
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-text">{n.title}</p>
                      <p className="mt-0.5 text-caption text-text-muted">{n.detail}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent activity — real, from task_activity */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <Activity className="h-4 w-4 text-text-secondary" />
          <h2 className="text-overline uppercase text-text-secondary">Recent activity</h2>
        </div>
        {recentActivity.length === 0 ? (
          <p className="rounded-sm border border-border bg-card p-3 text-caption text-text-muted">No activity yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <p className="text-caption leading-snug text-text-secondary">
                  <span className="text-text">{a.actorName ?? 'Someone'}</span> {a.verb.replace(/_/g, ' ')}
                  {a.taskTitle && (
                    <> <Link href={`/tasks/${a.taskId}`} className="text-accent hover:underline">{a.taskTitle}</Link></>
                  )}
                  <span className="ml-1 text-text-muted">· {ago(a.createdAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
