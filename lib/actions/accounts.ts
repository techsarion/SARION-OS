'use server';
// Account provisioning + password management.
//   • createAccount  — admin creates a user with an email + password directly
//                      (service role), then emails the credentials. No invite token.
//   • changePassword — any signed-in user updates their own password after
//                      re-authenticating with their current one.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { sendEmailSafe } from '@/lib/email';
import { roleLabel } from '@/lib/roles';
import { Role } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

function employeeCode(): string {
  return `EMP-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

// ── Admin: create an account with email + password ──────────────────────────
const createSchema = z.object({
  full_name: z.string().min(2, 'Enter the person’s full name.').max(120),
  email: z.string().email('Enter a valid work email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
  role: z.enum([Role.SUPER_ADMIN, Role.MANAGING_DIRECTOR, Role.DEPARTMENT_HEAD, Role.TEAM_LEAD, Role.MARKETING_OFFICER, Role.EMPLOYEE, Role.GUEST]),
  department_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  team_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
});

export async function createAccount(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await guard('user:create');
  if (!g.ok) return g.error;

  const parsed = createSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
    department_id: formData.get('department_id') ?? '',
    team_id: formData.get('team_id') ?? '',
  });
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  const input = parsed.data;
  const email = input.email.toLowerCase();

  try {
    const supabase = await createClient();
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle<{ id: string }>();
    if (existing) return fail('Someone with that email already has an account.', { fieldErrors: { email: ['Already a member'] } });

    const admin = createAdminClient();
    const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });
    if (createErr || !createdUser.user) return fail(createErr?.message ?? 'Could not create the account.');

    const profile: ProfileInsert = {
      id: createdUser.user.id,
      employee_code: employeeCode(),
      full_name: input.full_name,
      email,
      role: input.role,
      department_id: input.department_id,
      team_id: input.team_id,
      join_date: new Date().toISOString().slice(0, 10),
    };
    const { error: profileErr } = await admin.from('profiles').insert(profile as never);
    if (profileErr) {
      await admin.auth.admin.deleteUser(createdUser.user.id);
      return fail('Could not finish creating the profile. Please try again.');
    }

    // Email the new member their credentials (best-effort).
    await sendEmailSafe('accountCreated', email, {
      name: input.full_name,
      email,
      role: roleLabel(input.role),
      tempPassword: input.password,
      loginUrl: `${APP_URL}/login`,
    });
    await logActivity({ action: 'user.create_account', resourceType: 'profile', resourceId: createdUser.user.id, after: { email, role: input.role } });

    revalidatePath('/employees');
    return ok({ id: createdUser.user.id });
  } catch (err) {
    return failFrom(err);
  }
}

// ── Self-service: change my own password ────────────────────────────────────
const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.'),
    new_password: z.string().min(8, 'New password must be at least 8 characters.').max(72),
    confirm_password: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((d) => d.new_password === d.confirm_password, { message: 'Passwords do not match.', path: ['confirm_password'] })
  .refine((d) => d.new_password !== d.current_password, { message: 'Choose a different password.', path: ['new_password'] });

export async function changePassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });

  const parsed = passwordSchema.safeParse({
    current_password: formData.get('current_password'),
    new_password: formData.get('new_password'),
    confirm_password: formData.get('confirm_password'),
  });
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });

  try {
    const supabase = await createClient();
    // Re-authenticate to verify the current password (Supabase updateUser does
    // not check it). signInWithPassword refreshes this same user's session.
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.current_password });
    if (verifyErr) return fail('Your current password is incorrect.', { fieldErrors: { current_password: ['Incorrect password'] } });

    const { error: updateErr } = await supabase.auth.updateUser({ password: parsed.data.new_password });
    if (updateErr) return fail(updateErr.message);

    await logActivity({ action: 'auth.password_change', resourceType: 'profile', resourceId: user.id, actorId: user.id });
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}
