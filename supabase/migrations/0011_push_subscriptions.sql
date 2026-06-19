-- 0011 — Web Push subscriptions.
-- One row per browser/device a user has granted push permission on. The endpoint
-- is globally unique (same browser re-subscribing upserts). A scheduled Edge
-- Function reads these to deliver meeting / task / target reminders even when the
-- app is closed. `last_notified` lets the sender de-dupe so a reminder fires once.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

-- Remember what we've already pushed for, so the cron sender doesn't repeat.
-- key = e.g. 'meeting:<id>', 'task_due:<id>', 'target_due:<id>'.
create table if not exists push_sent_log (
  user_id uuid not null references profiles(id) on delete cascade,
  dedup_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, dedup_key)
);

alter table push_subscriptions enable row level security;
alter table push_sent_log     enable row level security;

-- A user manages only their own subscriptions; the service role (Edge Function)
-- bypasses RLS so it can read everyone's. Drop-then-create keeps this re-runnable.
drop policy if exists push_subs_own on push_subscriptions;
create policy push_subs_own on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists push_log_own on push_sent_log;
create policy push_log_own on push_sent_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
