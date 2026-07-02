-- Daily Execution Workspace — replaces the passive Daily Check-In with a working
-- daily planner. Every team member starts and ends their day here: they build a
-- to-do list, set a focus + top-3 priorities, log blockers/progress notes, and
-- at end-of-day carry unfinished work forward. History is kept forever.
--
-- Mirrors the leads/tasks conventions: soft-deletable rows, updated_at triggers,
-- an append-only *_activity table (read policy only; service-role writes), and
-- all-authenticated RLS (this is a small, fully-trusted admin team — 0007/0008).

-- ── Enums ────────────────────────────────────────────────────────────────────
create type daily_task_state  as enum ('NOT_STARTED','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED');
create type daily_task_source as enum ('MANUAL','CARRYOVER','TASK','LEAD_FOLLOWUP','MEETING_ACTION','TARGET','RECURRING');

-- ── daily_workspaces ─ one row per user per day ──────────────────────────────
create table daily_workspaces (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  work_date     date not null default current_date,
  focus         text,                       -- Section 2: one-sentence objective
  priorities    text[] not null default '{}', -- Section 3: top 3 (ordered)
  blockers      text,                       -- Section 4
  progress      text,                       -- optional single-field summary
  finished_at   timestamptz,                -- set when "Finish My Day" runs
  eod_went_well text,                        -- End-of-Day reflection
  eod_blockers  text,
  eod_tomorrow  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, work_date)
);
create index on daily_workspaces (work_date);
create index on daily_workspaces (user_id, work_date);
create trigger trg_daily_workspaces_updated before update on daily_workspaces
  for each row execute function set_updated_at();

-- ── daily_workspace_tasks ─ the to-do list (Section 1) ───────────────────────
create table daily_workspace_tasks (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references daily_workspaces(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  work_date         date not null default current_date,
  title             text not null,
  state             daily_task_state not null default 'NOT_STARTED',
  priority          priority not null default 'P2',
  category          text,
  due_time          time,
  estimated_minutes integer,
  sort_order        integer not null default 0,
  source            daily_task_source not null default 'MANUAL',
  source_ref        uuid,               -- id of the originating task/followup/etc.
  carried_from_date date,               -- set on carried-over rows (yellow banner)
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index on daily_workspace_tasks (workspace_id);
create index on daily_workspace_tasks (user_id, work_date);
create index on daily_workspace_tasks (state);
create trigger trg_daily_workspace_tasks_updated before update on daily_workspace_tasks
  for each row execute function set_updated_at();

-- ── task_carryovers ─ history of forwarded tasks ─────────────────────────────
create table task_carryovers (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references daily_workspace_tasks(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  from_date  date not null,
  to_date    date not null,
  created_at timestamptz not null default now()
);
create index on task_carryovers (task_id);
create index on task_carryovers (user_id);

-- ── daily_notes ─ live progress notes during the day (Section 5) ─────────────
create table daily_notes (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references daily_workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  work_date    date not null default current_date,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index on daily_notes (workspace_id);

-- ── daily_workspace_activity ─ append-only audit timeline ────────────────────
create table daily_workspace_activity (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references daily_workspaces(id) on delete cascade,
  actor_id     uuid references profiles(id),
  verb         text not null,   -- task_created / task_completed / task_carried / task_deleted / workspace_completed
  meta         jsonb,
  created_at   timestamptz not null default now()
);
create index on daily_workspace_activity (workspace_id);

-- ── RLS ─ transparency by default; service-role writes the activity log ──────
alter table daily_workspaces         enable row level security;
alter table daily_workspace_tasks    enable row level security;
alter table task_carryovers          enable row level security;
alter table daily_notes              enable row level security;
alter table daily_workspace_activity enable row level security;

create policy daily_workspaces_all      on daily_workspaces         for all to authenticated using (true) with check (true);
create policy daily_tasks_all           on daily_workspace_tasks    for all to authenticated using (true) with check (true);
create policy task_carryovers_all       on task_carryovers          for all to authenticated using (true) with check (true);
create policy daily_notes_all           on daily_notes              for all to authenticated using (true) with check (true);
-- Activity is append-only: readable by all, written only via the service role.
create policy daily_activity_read       on daily_workspace_activity for select to authenticated using (true);
