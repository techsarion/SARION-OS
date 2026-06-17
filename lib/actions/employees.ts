'use server';
// Employee administration (role / department / team / manager / status) and
// self-service profile edits. Admin edits require user:update; self edits are
// allowed for any authenticated user (RLS "profiles self-update").
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { Role, EmploymentStatus } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const adminSchema = z.object({
  role: z.enum([Role.SUPER_ADMIN, Role.MANAGING_DIRECTOR, Role.DEPARTMENT_HEAD, Role.TEAM_LEAD, Role.MARKETING_OFFICER, Role.EMPLOYEE, Role.GUEST]),
  status: z.enum([EmploymentStatus.ACTIVE, EmploymentStatus.ON_LEAVE, EmploymentStatus.RESIGNED, EmploymentStatus.TERMINATED]),
  designation: z.string().max(120).optional().or(z.literal('')).transform((v) => v || null),
  department_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  team_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  manager_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
});

const selfSchema = z.object({
  full_name: z.string().min(2, 'Your name is required.').max(120),
  phone: z.string().max(40).optional().or(z.literal('')).transform((v) => v || null),
  designation: z.string().max(120).optional().or(z.literal('')).transform((v) => v || null),
  skills: z.string().max(500).optional().transform((v) =>
    (v ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  ),
});

/** Admin/head edit of another employee's role & placement. */
export async function updateEmployee(id: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('user:update');
  if (!g.ok) return g.error;
  // Guard against self-demotion locking out the last admin path.
  if (id === g.user.id && formData.get('role') !== g.user.role) {
    return fail('You cannot change your own role. Ask another administrator.');
  }
  const parsed = adminSchema.safeParse({
    role: formData.get('role'), status: formData.get('status'), designation: formData.get('designation'),
    department_id: formData.get('department_id') ?? '', team_id: formData.get('team_id') ?? '',
    manager_id: formData.get('manager_id') ?? '',
  });
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  if (parsed.data.manager_id === id) return fail('An employee cannot report to themselves.', { fieldErrors: { manager_id: ['Invalid manager'] } });

  try {
    const supabase = await createClient();
    const patch: ProfileUpdate = parsed.data;
    const { error } = await supabase.from('profiles').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'user.update', resourceType: 'profile', resourceId: id, after: parsed.data });
    revalidatePath('/employees');
    revalidatePath(`/employees/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

/** Self-service profile edit (any authenticated user, own record only). */
export async function updateOwnProfile(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });
  const parsed = selfSchema.safeParse({
    full_name: formData.get('full_name'), phone: formData.get('phone'),
    designation: formData.get('designation'), skills: formData.get('skills') ?? '',
  });
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });

  try {
    const supabase = await createClient();
    const patch: ProfileUpdate = parsed.data;
    const { error } = await supabase.from('profiles').update(patch as never).eq('id', user.id);
    if (error) return fail(error.message);
    await logActivity({ action: 'user.self_update', resourceType: 'profile', resourceId: user.id });
    revalidatePath(`/employees/${user.id}`);
    revalidatePath('/profile');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}
