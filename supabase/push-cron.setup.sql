-- ─────────────────────────────────────────────────────────────────────────────
-- Schedule the push-reminders Edge Function with pg_cron.
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL). It is NOT a
-- migration — it stores a secret in Vault, so it must not live in version-tracked
-- migrations. Re-running is safe (unschedule-then-schedule + vault upsert).
--
-- Before running, replace the two placeholders below:
--   <PROJECT_REF>          → pkkyqfveoqbyqrizwfzq
--   <SERVICE_ROLE_KEY>     → your project's service_role key (Settings → API)
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Keep the service-role key out of cron.job's plaintext command by stashing it
-- in Vault and reading it back at call time. create_secret is a function (no
-- ON CONFLICT) — upsert by hand so this is safe to re-run.
do $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'push_reminders_service_key';
  if v_id is null then
    perform vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBra3lxZnZlb3FieXFyaXp3ZnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY2NDUyNSwiZXhwIjoyMDk3MjQwNTI1fQ.rJuFx10VRH8tkX8ETmdl_yjK4CdhRHIP6LFwa5er3Aw', 'push_reminders_service_key');
  else
    perform vault.update_secret(v_id, '<SERVICE_ROLE_KEY>');
  end if;
end $$;

-- Remove any prior schedule, then (re)create it for every 5 minutes.
select cron.unschedule('push-reminders') where exists (select 1 from cron.job where jobname = 'push-reminders');

select cron.schedule(
  'push-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://pkkyqfveoqbyqrizwfzq.functions.supabase.co/push-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_reminders_service_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verify:  select jobname, schedule, active from cron.job where jobname = 'push-reminders';
