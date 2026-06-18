-- 0007 — Team OS refactor for a 3-person startup.
-- Adds the Targets system (daily/weekly/monthly + team) and rounds out Meetings
-- (notes, type, participants, action-items → task conversion). The team is small
-- and all-admin, so RLS here is intentionally simple: any authenticated profile
-- may read and write. Org-hierarchy tables (departments/teams) are left intact
-- but hidden in the UI — nothing is dropped.

-- ───────────── enums ─────────────
create type target_period as enum ('DAILY','WEEKLY','MONTHLY');
create type target_scope  as enum ('PERSONAL','TEAM');
create type target_status as enum ('NOT_STARTED','IN_PROGRESS','COMPLETED');
create type meeting_type  as enum ('STANDUP','WEEKLY_REVIEW','MONTHLY_REVIEW','STRATEGY');

-- ───────────── targets ─────────────
-- One table backs all four target views. `period` splits Daily/Weekly/Monthly;
-- `scope` = PERSONAL (owner_id set) or TEAM (shared, owner_id is the creator).
create table targets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  period target_period not null,
  scope target_scope not null default 'PERSONAL',
  owner_id uuid not null references profiles(id) on delete cascade,
  status target_status not null default 'NOT_STARTED',
  progress int not null default 0 check (progress between 0 and 100),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on targets (period, scope);
create index on targets (owner_id);
create trigger trg_targets_updated before update on targets for each row execute function set_updated_at();

-- ───────────── meetings: round out the existing table ─────────────
alter table meetings add column if not exists notes text;
alter table meetings add column if not exists type meeting_type not null default 'STANDUP';

create table meeting_participants (
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create table meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  description text not null,
  assignee_id uuid references profiles(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,  -- set when converted to a task
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index on meeting_action_items (meeting_id);

-- ───────────── RLS — small all-admin team ─────────────
alter table targets               enable row level security;
alter table meeting_participants  enable row level security;
alter table meeting_action_items  enable row level security;

create policy targets_all              on targets              for all to authenticated using (true) with check (true);
create policy meeting_participants_all on meeting_participants for all to authenticated using (true) with check (true);
create policy meeting_action_items_all on meeting_action_items for all to authenticated using (true) with check (true);

-- Ensure meetings themselves are fully readable/writable by the team.
drop policy if exists meetings_all on meetings;
create policy meetings_all on meetings for all to authenticated using (true) with check (true);
