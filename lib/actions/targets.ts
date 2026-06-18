'use server';
// Targets — daily / weekly / monthly / team goals. Small all-admin team, so every
// member can create, edit, progress and delete any target. Each mutation runs
// through guard + audit logging + the ActionResult contract.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { statusFromProgress } from '@/lib/targets/constants';
import { TargetPeriod, TargetScope, TargetStatus } from '@/types/enums';
import type { TargetStatus as TargetStatusT } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type TargetInsert = Database['public']['Tables']['targets']['Insert'];
type TargetUpdate = Database['public']['Tables']['targets']['Update'];

const PERIOD_PATH: Record<string, string> = {
  DAILY: '/daily-targets', WEEKLY: '/weekly-targets', MONTHLY: '/monthly-targets',
};
function pathFor(period: string, scope: string): string {
  return scope === TargetScope.TEAM ? '/team-targets' : (PERIOD_PATH[period] ?? '/daily-targets');
}

const createSchema = z.object({
  title: z.string().min(2, 'Give the target a clear title.').max(200),
  description: z.string().max(2000).optional().or(z.literal('')).transform((v) => v || null),
  period: z.enum([TargetPeriod.DAILY, TargetPeriod.WEEKLY, TargetPeriod.MONTHLY]),
  scope: z.enum([TargetScope.PERSONAL, TargetScope.TEAM]).default(TargetScope.PERSONAL),
  owner_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  due_date: z.string().optional().or(z.literal('')).transform((v) => v || null),
});

export async function createTarget(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await guard('target:create');
  if (!g.ok) return g.error;
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  try {
    const supabase = await createClient();
    const row: TargetInsert = {
      title: d.title, description: d.description, period: d.period, scope: d.scope,
      owner_id: d.owner_id ?? g.user.id, due_date: d.due_date,
      status: TargetStatus.NOT_STARTED, progress: 0,
    };
    const { data: created, error } = await supabase.from('targets').insert(row as never).select('id').single<{ id: string }>();
    if (error || !created) return fail(error?.message ?? 'Could not create the target.');
    await logActivity({ action: 'target.create', resourceType: 'target', resourceId: created.id, after: { title: d.title, period: d.period, scope: d.scope } });
    revalidatePath(pathFor(d.period, d.scope));
    return ok({ id: created.id });
  } catch (err) {
    return failFrom(err);
  }
}

export async function setTargetStatus(id: string, status: TargetStatusT): Promise<ActionResult> {
  const g = await guard('target:update');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const progress = status === TargetStatus.COMPLETED ? 100 : status === TargetStatus.IN_PROGRESS ? 50 : 0;
    const patch: TargetUpdate = { status, progress };
    const { error } = await supabase.from('targets').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'target.status', resourceType: 'target', resourceId: id, after: { status } });
    revalidateAll();
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function setTargetProgress(id: string, progress: number): Promise<ActionResult> {
  const g = await guard('target:update');
  if (!g.ok) return g.error;
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  try {
    const supabase = await createClient();
    const patch: TargetUpdate = { progress: clamped, status: statusFromProgress(clamped) };
    const { error } = await supabase.from('targets').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'target.progress', resourceType: 'target', resourceId: id, after: { progress: clamped } });
    revalidateAll();
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function deleteTarget(id: string): Promise<ActionResult> {
  const g = await guard('target:delete');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('targets').delete().eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'target.delete', resourceType: 'target', resourceId: id });
    revalidateAll();
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

function revalidateAll() {
  for (const p of ['/daily-targets', '/weekly-targets', '/monthly-targets', '/team-targets', '/']) revalidatePath(p);
}
