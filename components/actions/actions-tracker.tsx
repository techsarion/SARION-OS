'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ArrowRightCircle } from 'lucide-react';
import { toast } from 'sonner';
import { toggleActionItem, convertActionItemToTask } from '@/lib/actions/meetings';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import type { ActionBuckets, ActionRow } from '@/lib/server/data/actions';
import { cn } from '@/lib/utils';

type Tab = 'open' | 'overdue' | 'completed';

export function ActionsTracker({ buckets }: { buckets: ActionBuckets }) {
  const [tab, setTab] = useState<Tab>(buckets.overdue.length ? 'overdue' : 'open');
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => { const res = await fn(); if (!res.ok) toast.error(res.error); });

  const tabs: { key: Tab; label: string; count: number; tone: 'accent' | 'danger' | 'success' }[] = [
    { key: 'open', label: 'Open', count: buckets.open.length, tone: 'accent' },
    { key: 'overdue', label: 'Overdue', count: buckets.overdue.length, tone: 'danger' },
    { key: 'completed', label: 'Completed', count: buckets.completed.length, tone: 'success' },
  ];
  const rows = buckets[tab];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-sm border border-border bg-surface-2 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn('rounded-sm px-3 py-1.5 text-body-sm transition-colors', tab === t.key ? 'bg-accent-soft text-text' : 'text-text-secondary hover:text-text')}
          >
            {t.label}<span className="ml-1.5 text-caption text-text-muted">{t.count}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={`No ${tab} actions`} description="Action items captured in meetings show up here." />
      ) : (
        <ul className="space-y-1.5">
          {rows.map((a) => <Row key={a.id} a={a} pending={pending} run={run} />)}
        </ul>
      )}
    </div>
  );
}

function Row({ a, pending, run }: { a: ActionRow; pending: boolean; run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void }) {
  return (
    <li className={cn('flex items-center gap-3 rounded-sm border border-border bg-card px-3 py-2.5', a.done && 'opacity-70')}>
      <button
        onClick={() => run(() => toggleActionItem(a.id, a.meetingId, !a.done))}
        disabled={pending}
        aria-label={a.done ? 'Mark not done' : 'Mark done'}
        className="shrink-0 text-text-muted transition-colors hover:text-success"
      >
        {a.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-body-sm text-text', a.done && 'line-through text-text-muted')}>{a.description}</p>
        <p className="text-caption text-text-muted">
          <Link href={`/meetings/${a.meetingId}`} className="hover:text-accent hover:underline">{a.meetingTitle}</Link>
          {' · '}{a.assigneeName ?? 'Unassigned'}
          {a.dueDate && <span className={cn('ml-1', a.isOverdue ? 'text-danger' : '')}>· due {a.dueDate}</span>}
        </p>
      </div>
      {a.isOverdue && <Badge tone="danger">Overdue</Badge>}
      {a.taskId ? (
        <Link href={`/tasks/${a.taskId}`} className="shrink-0 text-caption text-accent hover:underline">View task</Link>
      ) : !a.done ? (
        <button
          onClick={() => run(async () => { const res = await convertActionItemToTask(a.id, a.meetingId); if (res.ok) toast.success('Converted to task'); return res; })}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1 text-caption text-text-secondary transition-colors hover:text-accent"
        >
          <ArrowRightCircle className="h-3.5 w-3.5" /> To task
        </button>
      ) : null}
    </li>
  );
}
