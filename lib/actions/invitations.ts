'use server';
// Invite Member + Accept Invitation + Revoke. Token-gated onboarding for the
// internal workspace. Creation/lookup of auth users runs through the service
// role (RLS-bypassing) since it must happen before the invitee has a session.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendInviteEmail, sendEmailSafe } from '@/lib/email';
import { logActivity } from '@/lib/server/activity';
import { guard } from '@/lib/server/guard';
import { roleLabel } from '@/lib/roles';
import { Role } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const INVITE_TTL_DAYS = 7;

// Roles assignable by invite (never provision a second Owner this way).
const ASSIGNABLE_ROLES = [
  Role.MANAGING_DIRECTOR, Role.DEPARTMENT_HEAD, Role.TEAM_LEAD, Role.MARKETING_OFFICER, Role.EMPLOYEE, Role.GUEST,
] as const;

const inviteSchema = z.object({
  email: z.string().email('Enter a valid work email.'),
  full_name: z.string().min(2, 'Enter the person’s full name.').max(120),
  role: z.enum(ASSIGNABLE_ROLES),
  department_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  team_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
});

type InvitationInsert = Database['public']['Tables']['invitations']['Insert'];
type InvitationUpdate = Database['public']['Tables']['invitations']['Update'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

function employeeCode(): string {
  return `EMP-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

// ── Invite a member ────────────────────────────────────────────────────────
export async function inviteMember(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await guard('user:create');
  if (!g.ok) return g.error;

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    role: formData.get('role'),
    department_id: formData.get('department_id') ?? '',
    team_id: formData.get('team_id') ?? '',
  });
  if (!parsed.success) {
    return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  }
  const input = parsed.data;
  const email = input.email.toLowerCase();

  try {
    const supabase = await createClient();

    // Reject if an account already exists or a pending invite is outstanding.
    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
    if (existingProfile) return fail('Someone with that email already has an account.', { fieldErrors: { email: ['Already a member'] } });
    const { data: pending } = await supabase.from('invitations').select('id').eq('email', email).eq('status', 'PENDING').maybeSingle();
    if (pending) return fail('There is already a pending invitation for that email.', { fieldErrors: { email: ['Already invited'] } });

    const token = randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();
    const row: InvitationInsert = {
      email,
      full_name: input.full_name,
      role: input.role,
      department_id: input.department_id,
      team_id: input.team_id,
      token,
      status: 'PENDING',
      invited_by: g.user.id,
      expires_at: expiresAt,
    };
    const { data: created, error } = await supabase
      .from('invitations')
      .insert(row as never)
      .select('id')
      .single<{ id: string }>();
    if (error || !created) return fail(error?.message ?? 'Could not create the invitation.');

    // Department name for the email (best-effort).
    let departmentName: string | undefined;
    if (input.department_id) {
      const { data: dept } = await supabase.from('departments').select('name').eq('id', input.department_id).maybeSingle<{ name: string }>();
      departmentName = dept?.name;
    }

    await sendInviteEmail({
      to: email,
      inviteeName: input.full_name,
      inviterName: g.user.fullName,
      role: roleLabel(input.role),
      department: departmentName,
      inviteUrl: `${APP_URL}/accept-invite?token=${token}`,
      expiryDays: INVITE_TTL_DAYS,
    });

    await logActivity({
      action: 'user.invite',
      resourceType: 'invitation',
      resourceId: created.id,
      after: { email, role: input.role, department_id: input.department_id },
    });

    revalidatePath('/employees');
    return ok({ id: created.id });
  } catch (err) {
    return failFrom(err);
  }
}

// ── Revoke a pending invite ─────────────────────────────────────────────────
export async function revokeInvitation(id: string): Promise<ActionResult> {
  const g = await guard('user:create');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const patch: InvitationUpdate = { status: 'REVOKED' };
    const { error } = await supabase.from('invitations').update(patch as never).eq('id', id).eq('status', 'PENDING');
    if (error) return fail(error.message);
    await logActivity({ action: 'user.invite_revoke', resourceType: 'invitation', resourceId: id });
    revalidatePath('/employees');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ── Accept an invitation (public, token-gated) ──────────────────────────────
const acceptSchema = z.object({
  token: z.string().min(8, 'This invitation link is invalid.'),
  full_name: z.string().min(2, 'Enter your full name.').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72, 'Password must be 72 characters or fewer.'),
});

export async function acceptInvitation(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = acceptSchema.safeParse({
    token: formData.get('token'),
    full_name: formData.get('full_name'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Please check your details.', {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const input = parsed.data;

  try {
    const admin = createAdminClient();
    const { data: invite } = await admin
      .from('invitations')
      .select('id, email, role, department_id, team_id, status, expires_at')
      .eq('token', input.token)
      .maybeSingle();

    if (!invite || invite.status !== 'PENDING') return fail('This invitation is no longer valid.');
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      await admin.from('invitations').update({ status: 'EXPIRED' } as never).eq('id', invite.id);
      return fail('This invitation has expired. Ask an administrator to re-invite you.');
    }

    // Create the auth user (email pre-confirmed — they're already verified by invite).
    const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
      email: invite.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });
    if (createErr || !createdUser.user) return fail(createErr?.message ?? 'Could not create your account.');

    const profile: ProfileInsert = {
      id: createdUser.user.id,
      employee_code: employeeCode(),
      full_name: input.full_name,
      email: invite.email,
      role: invite.role,
      department_id: invite.department_id,
      team_id: invite.team_id,
      join_date: new Date().toISOString().slice(0, 10),
    };
    const { error: profileErr } = await admin.from('profiles').insert(profile as never);
    if (profileErr) {
      // Roll back the orphaned auth user so the invite can be retried.
      await admin.auth.admin.deleteUser(createdUser.user.id);
      return fail('Could not finish setting up your profile. Please try again.');
    }

    await admin.from('invitations').update({ status: 'ACCEPTED', accepted_at: new Date().toISOString() } as never).eq('id', invite.id);

    await sendEmailSafe('accountCreated', invite.email, {
      name: input.full_name,
      email: invite.email,
      role: roleLabel(invite.role),
      loginUrl: `${APP_URL}/login`,
    });
    await logActivity({ action: 'user.accept_invite', resourceType: 'profile', resourceId: createdUser.user.id, actorId: createdUser.user.id });

    return ok();
  } catch (err) {
    return failFrom(err);
  }
}
