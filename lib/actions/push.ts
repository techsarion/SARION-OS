'use server';
// Web Push subscription management. Any signed-in user may register or remove a
// push subscription for their own browser/device. Stored in push_subscriptions;
// the scheduled Edge Function reads them to deliver reminders.
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

export async function savePushSubscription(sub: PushSubscriptionInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return fail('Invalid subscription.');
  try {
    const supabase = await createClient();
    const row = {
      user_id: user.id, endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh, auth: sub.keys.auth,
      user_agent: sub.userAgent ?? null,
    };
    // Upsert on the unique endpoint so re-subscribing the same browser is idempotent.
    const { error } = await supabase.from('push_subscriptions').upsert(row as never, { onConflict: 'endpoint' });
    if (error) return fail(error.message);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id);
    if (error) return fail(error.message);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}
