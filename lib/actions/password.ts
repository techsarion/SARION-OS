'use server';
// Forgot / reset password — Supabase Auth, but delivered through our OWN branded
// Team OS email (no-reply@) instead of Supabase's default template.
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPasswordResetEmail } from '@/lib/email';
import { logActivity } from '@/lib/server/activity';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const emailSchema = z.object({ email: z.string().email('Enter a valid work email.') });
const resetSchema = z.object({
  token_hash: z.string().min(1, 'This reset link is invalid or has expired.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

/**
 * Step 1 — request a reset. Always returns success (never reveals whether an
 * account exists). If the email maps to a real user, generate a recovery link
 * via the service role and send it through our branded passwordReset template.
 */
export async function requestPasswordReset(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid email.', {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const email = parsed.data.email.toLowerCase();

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });

    // No such user (or generation failed) — stay silent to avoid enumeration.
    if (!error && data?.properties?.hashed_token) {
      const resetUrl = `${APP_URL}/reset-password?token_hash=${data.properties.hashed_token}&type=recovery`;
      await sendPasswordResetEmail(email, resetUrl, data.user?.user_metadata?.full_name as string | undefined);
    }
  } catch {
    // Swallow — never leak whether the address exists.
  }
  return ok();
}

/** Step 2 — verify the recovery token, set the new password. */
export async function resetPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token_hash: formData.get('token_hash'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid request.', {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const supabase = await createClient();
    const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: parsed.data.token_hash,
    });
    if (verifyError || !verified.user) {
      return fail('This reset link is invalid or has expired. Request a new one.');
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (updateError) return fail(updateError.message);

    await logActivity({ action: 'auth.password_reset', resourceType: 'profile', resourceId: verified.user.id, actorId: verified.user.id });
    await supabase.auth.signOut();
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}
