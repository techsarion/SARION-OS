'use server';
// Auth Server Actions (Supabase Auth). No separate API needed.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/server/activity';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signIn(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'Enter a valid email and password (min 8 chars).' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  // Audit the authentication event (best-effort; never blocks login).
  if (data.user) await logActivity({ action: 'auth.login', resourceType: 'auth', actorId: data.user.id });

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await logActivity({ action: 'auth.logout', resourceType: 'auth', actorId: user.id });
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
