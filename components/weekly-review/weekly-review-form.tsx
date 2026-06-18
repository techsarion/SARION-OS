'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveWeeklyReview } from '@/lib/actions/weekly-review';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { SavedReview } from '@/lib/server/data/weekly-review';
import type { ActionResult } from '@/lib/actions/result';

export function WeeklyReviewForm({
  existing,
  suggestedCompletion,
  carryForwardSeed,
}: {
  existing: SavedReview | null;
  suggestedCompletion: number;
  carryForwardSeed: string;
}) {
  const [state, formAction, pending] = useActionState(saveWeeklyReview as (prev: unknown, fd: FormData) => Promise<ActionResult>, null);
  const router = useRouter();
  const [pct, setPct] = useState(existing?.completionPct ?? suggestedCompletion);

  useEffect(() => {
    if (state?.ok) { toast.success('Weekly review saved'); router.refresh(); }
    else if (state && !state.ok && !state.fieldErrors) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="completion_pct">Completion %</Label>
          <span className="tabular-nums text-body-sm text-text">{pct}%</span>
        </div>
        <input
          id="completion_pct"
          name="completion_pct"
          type="range"
          min={0}
          max={100}
          step={5}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="w-full accent-[var(--accent,#2f80f7)]"
        />
        {!existing && suggestedCompletion > 0 && (
          <p className="text-caption text-text-muted">Suggested from your weekly targets: {suggestedCompletion}%</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="summary">Weekly summary</Label>
        <Textarea id="summary" name="summary" defaultValue={existing?.summary ?? ''} placeholder="What went well, what didn't, key learnings…" className="min-h-[120px]" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="carry_forward">Carry-forward tasks</Label>
        <Textarea id="carry_forward" name="carry_forward" defaultValue={existing?.carryForward ?? carryForwardSeed} placeholder="What rolls into next week…" className="min-h-[100px]" />
      </div>

      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : existing ? 'Update review' : 'Save review'}</Button>
    </form>
  );
}
