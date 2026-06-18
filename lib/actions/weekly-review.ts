'use server';
// Weekly Review actions — one row per user per ISO week (upserted), audit-logged.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { weekStartISO } from '@/lib/server/data/weekly-review';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type ReviewInsert = Database['public']['Tables']['weekly_reviews']['Insert'];

const schema = z.object({
  completion_pct: z.coerce.number().min(0).max(100).default(0),
  summary: z.string().max(8000).optional().or(z.literal('')).transform((v) => v || null),
  carry_forward: z.string().max(8000).optional().or(z.literal('')).transform((v) => v || null),
});

export async function saveWeeklyReview(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('review:write');
  if (!g.ok) return g.error;
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  try {
    const supabase = await createClient();
    const row: ReviewInsert = {
      user_id: g.user.id, week_start: weekStartISO(),
      completion_pct: Math.round(d.completion_pct), summary: d.summary, carry_forward: d.carry_forward,
    };
    const { error } = await supabase.from('weekly_reviews').upsert(row as never, { onConflict: 'user_id,week_start' } as never);
    if (error) return fail(error.message);
    await logActivity({ action: 'review.save', resourceType: 'weekly_review', after: { week_start: row.week_start, completion_pct: row.completion_pct } });
    revalidatePath('/weekly-review');
    revalidatePath('/pulse');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}
