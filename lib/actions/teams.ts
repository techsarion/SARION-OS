'use server';
// Team management — create / update / delete. Admins manage any team; department
// heads manage teams within their own department (enforced by RLS + RBAC).
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type TeamInsert = Database['public']['Tables']['teams']['Insert'];
type TeamUpdate = Database['public']['Tables']['teams']['Update'];

const schema = z.object({
  name: z.string().min(2, 'Team name is required.').max(80),
  department_id: z.string().uuid('Choose a department.'),
  description: z.string().max(500).optional().or(z.literal('')).transform((v) => v || null),
  lead_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
});

export async function createTeam(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await guard('team:create');
  if (!g.ok) return g.error;
  const parsed = schema.safeParse({
    name: formData.get('name'), department_id: formData.get('department_id'),
    description: formData.get('description'), lead_id: formData.get('lead_id') ?? '',
  });
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });

  try {
    const supabase = await createClient();
    const row: TeamInsert = parsed.data;
    const { data, error } = await supabase.from('teams').insert(row as never).select('id').single<{ id: string }>();
    if (error || !data) return fail(error?.message ?? 'Could not create the team.');
    await logActivity({ action: 'team.create', resourceType: 'team', resourceId: data.id, after: parsed.data });
    revalidatePath('/teams');
    return ok({ id: data.id });
  } catch (err) {
    return failFrom(err);
  }
}

export async function updateTeam(id: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('team:update');
  if (!g.ok) return g.error;
  const parsed = schema.safeParse({
    name: formData.get('name'), department_id: formData.get('department_id'),
    description: formData.get('description'), lead_id: formData.get('lead_id') ?? '',
  });
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });

  try {
    const supabase = await createClient();
    const patch: TeamUpdate = parsed.data;
    const { error } = await supabase.from('teams').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'team.update', resourceType: 'team', resourceId: id, after: parsed.data });
    revalidatePath('/teams');
    revalidatePath(`/teams/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  const g = await guard('team:update');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'team.delete', resourceType: 'team', resourceId: id });
    revalidatePath('/teams');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}
