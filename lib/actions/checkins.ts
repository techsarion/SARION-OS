'use server';
// Daily Check-In (morning) + End-of-Day update actions. One row per user/kind/day
// (upserted), every save audit-logged. Small all-admin team → guarded by the
// generic checkin:write permission.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { CheckinKind } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type CheckInInsert = Database['public']['Tables']['check_ins']['Insert'];

const todayISO = () => new Date().toISOString().slice(0, 10);
const text = () => z.string().max(4000).optional().or(z.literal('')).transform((v) => v || null);

const morningSchema = z.object({ focus: text(), priorities: text(), blockers: text(), progress: text() });
const eodSchema = z.object({ completed: text(), unfinished: text(), blockers: text(), notes: text() });

async function save(kind: 'MORNING' | 'EOD', payload: Partial<CheckInInsert>, userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const row: CheckInInsert = { user_id: userId, kind, entry_date: todayISO(), ...payload };
  const { error } = await supabase
    .from('check_ins')
    .upsert(row as never, { onConflict: 'user_id,kind,entry_date' } as never);
  if (error) return fail(error.message);
  await logActivity({ action: kind === 'MORNING' ? 'checkin.save' : 'eod.save', resourceType: 'check_in', after: { kind } });
  revalidatePath(kind === 'MORNING' ? '/check-in' : '/end-of-day');
  revalidatePath('/me');
  revalidatePath('/pulse');
  return ok();
}

export async function saveCheckIn(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('checkin:write');
  if (!g.ok) return g.error;
  const parsed = morningSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Could not save your check-in.');
  try {
    return await save(CheckinKind.MORNING, parsed.data, g.user.id);
  } catch (err) {
    return failFrom(err);
  }
}

export async function saveEndOfDay(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('checkin:write');
  if (!g.ok) return g.error;
  const parsed = eodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Could not save your end-of-day update.');
  try {
    return await save(CheckinKind.EOD, parsed.data, g.user.id);
  } catch (err) {
    return failFrom(err);
  }
}
