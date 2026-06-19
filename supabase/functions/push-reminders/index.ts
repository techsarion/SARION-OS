// push-reminders — scheduled Edge Function.
// Invoked every few minutes by pg_cron. Finds reminders that are due right now
// (meetings starting soon, tasks/targets due today) and delivers a Web Push to
// each recipient's subscribed browsers. push_sent_log de-dupes so each reminder
// fires once. Runs with the service-role key, so it bypasses RLS.
//
// Required function secrets (set via `supabase secrets set`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected by Supabase)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//   APP_URL  (used to build deep links, no trailing slash)

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:3000';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:report@watcon.net',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface Reminder { userId: string; key: string; title: string; body: string; url: string; }

/** Meetings starting within the next 15 minutes → remind every participant. */
async function meetingReminders(): Promise<Reminder[]> {
  const now = new Date();
  const soon = new Date(now.getTime() + 15 * 60_000);
  const { data: meetings } = await supabase
    .from('meetings').select('id, title, scheduled_at')
    .gte('scheduled_at', now.toISOString()).lte('scheduled_at', soon.toISOString());
  const list = (meetings ?? []) as { id: string; title: string; scheduled_at: string }[];
  if (!list.length) return [];

  const ids = list.map((m) => m.id);
  const { data: parts } = await supabase
    .from('meeting_participants').select('meeting_id, user_id').in('meeting_id', ids);
  const byMeeting = new Map<string, string[]>();
  for (const p of (parts ?? []) as { meeting_id: string; user_id: string }[]) {
    (byMeeting.get(p.meeting_id) ?? byMeeting.set(p.meeting_id, []).get(p.meeting_id)!).push(p.user_id);
  }
  const out: Reminder[] = [];
  for (const m of list) {
    const when = new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    for (const userId of byMeeting.get(m.id) ?? []) {
      out.push({ userId, key: `meeting:${m.id}`, title: 'Meeting starting soon', body: `${m.title} at ${when}`, url: `${APP_URL}/meetings/${m.id}` });
    }
  }
  return out;
}

/** Tasks due today (not completed) → remind the assignee. Once per due-date. */
async function taskReminders(): Promise<Reminder[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('tasks').select('id, title, assignee_id, due_date, status')
    .eq('due_date', today).neq('status', 'COMPLETED').not('assignee_id', 'is', null);
  return ((data ?? []) as { id: string; title: string; assignee_id: string }[]).map((t) => ({
    userId: t.assignee_id, key: `task_due:${t.id}:${today}`,
    title: 'Task due today', body: t.title, url: `${APP_URL}/tasks/${t.id}`,
  }));
}

/** Targets due today (not completed) → remind the owner. Once per due-date. */
async function targetReminders(): Promise<Reminder[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('targets').select('id, title, owner_id, due_date, status')
    .eq('due_date', today).neq('status', 'COMPLETED');
  return ((data ?? []) as { id: string; title: string; owner_id: string }[]).map((t) => ({
    userId: t.owner_id, key: `target_due:${t.id}:${today}`,
    title: 'Target due today', body: t.title, url: `${APP_URL}/targets`,
  }));
}

Deno.serve(async () => {
  const reminders = [
    ...await meetingReminders(),
    ...await taskReminders(),
    ...await targetReminders(),
  ];
  if (!reminders.length) return Response.json({ sent: 0 });

  // Drop reminders already logged for that (user, key).
  const { data: logged } = await supabase
    .from('push_sent_log').select('user_id, dedup_key')
    .in('dedup_key', reminders.map((r) => r.key));
  const sentSet = new Set(((logged ?? []) as { user_id: string; dedup_key: string }[]).map((l) => `${l.user_id}|${l.dedup_key}`));
  const fresh = reminders.filter((r) => !sentSet.has(`${r.userId}|${r.key}`));
  if (!fresh.length) return Response.json({ sent: 0 });

  // Load subscriptions for the recipients.
  const userIds = [...new Set(fresh.map((r) => r.userId))];
  const { data: subs } = await supabase
    .from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', userIds);
  const subsByUser = new Map<string, { id: string; endpoint: string; p256dh: string; auth: string }[]>();
  for (const s of (subs ?? []) as { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[]) {
    (subsByUser.get(s.user_id) ?? subsByUser.set(s.user_id, []).get(s.user_id)!).push(s);
  }

  let sent = 0;
  const staleSubIds: string[] = [];
  for (const r of fresh) {
    const userSubs = subsByUser.get(r.userId) ?? [];
    if (!userSubs.length) continue;
    const payload = JSON.stringify({ title: r.title, body: r.body, url: r.url, tag: r.key });
    let delivered = false;
    for (const s of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        delivered = true;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) staleSubIds.push(s.id); // gone — prune
      }
    }
    if (delivered) {
      await supabase.from('push_sent_log').upsert({ user_id: r.userId, dedup_key: r.key } as never, { onConflict: 'user_id,dedup_key' });
      sent++;
    }
  }
  if (staleSubIds.length) await supabase.from('push_subscriptions').delete().in('id', staleSubIds);

  return Response.json({ sent, pruned: staleSubIds.length });
});
