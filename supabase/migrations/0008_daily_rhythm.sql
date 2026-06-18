-- 0008 — Daily/weekly rhythm for the startup team.
-- Adds Daily Check-Ins (morning) + End-of-Day updates (one `check_ins` table,
-- split by `kind`), Weekly Reviews, and due dates on meeting action items so the
-- /actions tracker can flag overdue follow-ups. Small all-admin team → simple,
-- permissive RLS (any authenticated member may read/write).

create type checkin_kind as enum ('MORNING','EOD');

-- One row per person per day per kind (morning check-in vs end-of-day update).
create table check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind checkin_kind not null,
  entry_date date not null default current_date,
  -- MORNING fields
  focus text,
  priorities text,
  progress text,
  -- EOD fields
  completed text,
  unfinished text,
  notes text,
  -- shared
  blockers text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, entry_date)
);
create index on check_ins (entry_date);
create index on check_ins (user_id, kind);
create trigger trg_check_ins_updated before update on check_ins for each row execute function set_updated_at();

-- One weekly review per person per ISO week (week_start = Monday).
create table weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  completion_pct int not null default 0 check (completion_pct between 0 and 100),
  summary text,
  carry_forward text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);
create index on weekly_reviews (week_start);
create trigger trg_weekly_reviews_updated before update on weekly_reviews for each row execute function set_updated_at();

-- Meeting action items gain a due date so they can be tracked open/overdue.
alter table meeting_action_items add column if not exists due_date date;

-- ───────────── RLS ─────────────
alter table check_ins      enable row level security;
alter table weekly_reviews enable row level security;

create policy check_ins_all      on check_ins      for all to authenticated using (true) with check (true);
create policy weekly_reviews_all on weekly_reviews for all to authenticated using (true) with check (true);
