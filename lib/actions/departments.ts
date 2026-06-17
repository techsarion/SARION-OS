'use server';
// Department management — create / update / soft-delete. Admin-scoped (RBAC +
// RLS). Mirrors the ActionResult + audit-log pattern.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type DeptInsert = Database['public']['Tables']['departments']['Insert'];
type DeptUpdate = Database['public']['Tables']['departments']['Update'];

const schema = z.object({
  name: z.string().min(2, 'Department name is required.').max(80),
  description: z.string().max(500).optional().or(z.literal('')).transform((v) => v || null),
  head_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
});

export async function createDepartment(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await guard('dept:create');
  if (!g.ok) return g.error;
  const parsed = schema.safeParse({
    name: formData.get('name'), description: formData.get('description'), head_id: formData.get('head_id') ?? '',
  });
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });

  try {
    const supabase = await createClient();
    const row: DeptInsert = parsed.data;
    const { data, error } = await supabase.from('departments').insert(row as never).select('id').single<{ id: string }>();
    if (error || !data) return fail(error?.message ?? 'Could not create the department.');
    await logActivity({ action: 'dept.create', resourceType: 'department', resourceId: data.id, after: parsed.data });
    revalidatePath('/departments');
    return ok({ id: data.id });
  } catch (err) {
    return failFrom(err);
  }
}

export async function updateDepartment(id: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('dept:update');
  if (!g.ok) return g.error;
  const parsed = schema.safeParse({
    name: formData.get('name'), description: formData.get('description'), head_id: formData.get('head_id') ?? '',
  });
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });

  try {
    const supabase = await createClient();
    const patch: DeptUpdate = parsed.data;
    const { error } = await supabase.from('departments').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'dept.update', resourceType: 'department', resourceId: id, after: parsed.data });
    revalidatePath('/departments');
    revalidatePath(`/departments/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  const g = await guard('dept:remove');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const patch: DeptUpdate = { deleted_at: new Date().toISOString() };
    const { error } = await supabase.from('departments').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'dept.delete', resourceType: 'department', resourceId: id });
    revalidatePath('/departments');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}
