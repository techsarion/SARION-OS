-- Sarion OS — initial schema (translated from the former Prisma model, docs/03).
-- Supabase Postgres + Row Level Security. Auth handled by Supabase (auth.users).
-- `profiles` extends auth.users with org/role data.

-- ───────────── extensions & enums ─────────────
create extension if not exists "pgcrypto";

create type role as enum ('SUPER_ADMIN','MANAGING_DIRECTOR','DEPARTMENT_HEAD','TEAM_LEAD','EMPLOYEE','GUEST');
create type employment_status as enum ('ACTIVE','ON_LEAVE','RESIGNED','TERMINATED');
create type task_status as enum ('DRAFT','ASSIGNED','IN_PROGRESS','REVIEW','APPROVED','COMPLETED');
create type priority as enum ('P0','P1','P2','P3');
create type project_status as enum ('PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED');
create type meeting_status as enum ('CREATED','INVITED','CONDUCTED','MINUTED','CLOSED');

-- ───────────── org ─────────────
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  head_id uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department_id uuid not null references departments(id) on delete cascade,
  lead_id uuid,
  created_at timestamptz not null default now(),
  unique (department_id, name)
);

-- ───────────── profiles (extends auth.users) ─────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_code text unique not null,
  full_name text not null,
  email text unique not null,
  phone text,
  designation text,
  role role not null default 'EMPLOYEE',
  status employment_status not null default 'ACTIVE',
  department_id uuid references departments(id),
  manager_id uuid references profiles(id),
  team_id uuid references teams(id),
  join_date date,
  avatar_url text,
  skills text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on profiles (department_id);
create index on profiles (manager_id);
create index on profiles (role, status);

-- ───────────── projects & tasks ─────────────
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  department_id uuid not null references departments(id),
  status project_status not null default 'PLANNING',
  budget numeric(14,2),
  owner_id uuid references profiles(id),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on projects (department_id, status);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  department_id uuid references departments(id),
  project_id uuid references projects(id) on delete set null,
  parent_task_id uuid references tasks(id),
  owner_id uuid not null references profiles(id),
  assignee_id uuid references profiles(id),
  priority priority not null default 'P2',
  status task_status not null default 'DRAFT',
  start_date date,
  due_date date,
  estimated_hours numeric,
  actual_hours numeric,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on tasks (assignee_id, status);
create index on tasks (project_id, status);
create index on tasks (due_date);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on task_comments (task_id);

create table task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  actor_id uuid references profiles(id),
  verb text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index on task_activity (task_id);

-- ───────────── meetings ─────────────
create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status meeting_status not null default 'CREATED',
  organizer_id uuid not null references profiles(id),
  department_id uuid references departments(id),
  scheduled_at timestamptz not null,
  duration_min int not null default 30,
  agenda jsonb,
  recording_url text,
  created_at timestamptz not null default now()
);
create index on meetings (scheduled_at);

-- ───────────── audit log ─────────────
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index on audit_log (resource_type, resource_id);
create index on audit_log (actor_id);

-- ───────────── updated_at trigger ─────────────
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_tasks_updated before update on tasks for each row execute function set_updated_at();
