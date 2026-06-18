'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Plus, Trash2, Target as TargetIcon, Check, Circle, CircleDot } from 'lucide-react';
import { toast } from 'sonner';
import { createTarget, setTargetStatus, setTargetProgress, deleteTarget } from '@/lib/actions/targets';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { TARGET_STATUS_META, PROGRESS_STEPS, PERIOD_META } from '@/lib/targets/constants';
import { TargetStatus } from '@/types/enums';
import type { TargetStatus as TargetStatusT, TargetPeriod as TargetPeriodT, TargetScope as TargetScopeT } from '@/types/enums';
import type { TargetItem } from '@/lib/server/data/targets';
import type { ActionResult } from '@/lib/actions/result';
import { cn } from '@/lib/utils';

interface Props {
  targets: TargetItem[];
  people: { id: string; full_name: string }[];
  currentUserId: string;
  period: TargetPeriodT;
  scope: TargetScopeT;
  /** 'status' = daily (3-state); 'progress' = weekly/monthly/team (0–100). */
  variant: 'status' | 'progress';
}

const STATUS_ICON: Record<TargetStatusT, typeof Circle> = {
  NOT_STARTED: Circle,
  IN_PROGRESS: CircleDot,
  COMPLETED: Check,
};

export function TargetsView({ targets, people, currentUserId, period, scope, variant }: Props) {
  const [showForm, setShowForm] = useState(targets.length === 0);

  // Group personal targets by owner so each person's list is clear.
  const groups =
    scope === 'TEAM'
      ? [{ ownerId: 'team', ownerName: 'Team Goals', items: targets }]
      : people
          .map((p) => ({ ownerId: p.id, ownerName: p.full_name, items: targets.filter((t) => t.ownerId === p.id) }))
          .filter((g) => g.items.length > 0 || g.ownerId === currentUserId);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant={showForm ? 'ghost' : 'primary'} size="md" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4" /> {showForm ? 'Hide' : `New ${PERIOD_META[period].noun}`}
        </Button>
      </div>

      {showForm && (
        <CreateForm
          period={period}
          scope={scope}
          people={people}
          currentUserId={currentUserId}
          onDone={() => setShowForm(false)}
        />
      )}

      {targets.length === 0 ? (
        <EmptyState
          icon={TargetIcon}
          title={`No ${PERIOD_META[period].noun}s yet`}
          description="Create one above to start tracking what matters this period."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.ownerId} className="space-y-2.5">
              {scope !== 'TEAM' && (
                <h2 className="text-overline uppercase text-text-secondary">
                  {g.ownerName}
                  {g.ownerId === currentUserId && <span className="ml-1.5 text-text-muted">· you</span>}
                </h2>
              )}
              {g.items.length === 0 ? (
                <p className="rounded-sm border border-dashed border-border bg-surface-2/40 px-3 py-4 text-caption text-text-muted">
                  No targets set.
                </p>
              ) : (
                <div className="space-y-2">
                  {g.items.map((t) => (
                    <TargetCard key={t.id} target={t} variant={variant} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateForm({
  period,
  scope,
  people,
  currentUserId,
  onDone,
}: {
  period: TargetPeriodT;
  scope: TargetScopeT;
  people: { id: string; full_name: string }[];
  currentUserId: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createTarget as (prev: unknown, fd: FormData) => Promise<ActionResult>,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success('Target created');
      onDone();
    } else if (state && !state.ok && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4 rounded-sm border border-border bg-card p-4">
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="scope" value={scope} />
      <div className="space-y-1.5">
        <Label htmlFor="t-title">Title</Label>
        <Input id="t-title" name="title" placeholder="What needs to be achieved?" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="t-desc">Description (optional)</Label>
        <Textarea id="t-desc" name="description" placeholder="Context or success criteria…" className="min-h-[64px]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scope === 'PERSONAL' && (
          <div className="space-y-1.5">
            <Label htmlFor="t-owner">Owner</Label>
            <Select id="t-owner" name="owner_id" defaultValue={currentUserId}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="t-due">{period === 'DAILY' ? 'For (date)' : period === 'WEEKLY' ? 'Due date' : 'Target date'}</Label>
          <Input id="t-due" name="due_date" type="date" min={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Create target'}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function TargetCard({ target: t, variant }: { target: TargetItem; variant: 'status' | 'progress' }) {
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
    });

  const meta = TARGET_STATUS_META[t.status];

  return (
    <div className={cn('rounded-sm border border-border bg-card p-3.5 transition-colors', pending && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-text">{t.title}</p>
          {t.description && <p className="mt-0.5 text-caption text-text-muted">{t.description}</p>}
          <div className="mt-1.5 flex items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {t.dueDate && <span className="text-caption text-text-muted">· {t.dueDate}</span>}
          </div>
        </div>
        <button
          onClick={() => run(() => deleteTarget(t.id))}
          disabled={pending}
          aria-label="Delete target"
          className="shrink-0 rounded-sm p-1.5 text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {variant === 'status' ? (
        <div className="mt-3 flex items-center gap-1.5">
          {([TargetStatus.NOT_STARTED, TargetStatus.IN_PROGRESS, TargetStatus.COMPLETED] as TargetStatusT[]).map((s) => {
            const Icon = STATUS_ICON[s];
            const active = t.status === s;
            return (
              <button
                key={s}
                onClick={() => run(() => setTargetStatus(t.id, s))}
                disabled={pending || active}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-caption transition-colors',
                  active
                    ? 'border-accent bg-accent-soft text-text'
                    : 'border-border text-text-secondary hover:border-text-muted hover:text-text',
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {TARGET_STATUS_META[s].label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-caption text-text-muted">
            <span>Progress</span>
            <span className="tabular-nums text-text">{t.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={t.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${t.title} progress`}>
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-base"
              style={{ width: `${t.progress}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {PROGRESS_STEPS.map((step) => (
              <button
                key={step}
                onClick={() => run(() => setTargetProgress(t.id, step))}
                disabled={pending || t.progress === step}
                className={cn(
                  'rounded-sm border px-2 py-0.5 text-caption tabular-nums transition-colors',
                  t.progress === step
                    ? 'border-accent bg-accent-soft text-text'
                    : 'border-border text-text-secondary hover:border-text-muted hover:text-text',
                )}
              >
                {step}%
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
