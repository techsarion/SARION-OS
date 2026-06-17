-- Sarion OS — org management + invitations (phase: people & structure).
-- Adds descriptive metadata to departments/teams and a token-gated invitation
-- flow. Keeps the existing RLS philosophy (docs/02): admins manage org,
-- department heads manage within their own department.

-- ───────────── enums ─────────────
create type invitation_status as enum ('PENDING','ACCEPTED','EXPIRED','REVOKED');

-- ───────────── descriptive columns ─────────────
alter table departments add column if not exists description text;
alter table teams        add column if not exists description text;

-- ───────────── invitations ─────────────
create table invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  role role not null default 'EMPLOYEE',
  department_id uuid references departments(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  token text unique not null,
  status invitation_status not null default 'PENDING',
  invited_by uuid references profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on invitations (email);
create index on invitations (status);
create unique index invitations_pending_email_uniq
  on invitations (lower(email)) where status = 'PENDING';

-- ───────────── RLS ─────────────
alter table invitations enable row level security;

-- Admins manage all invitations; department heads manage invitations scoped to
-- their own department. Acceptance (token lookup + profile creation) runs through
-- the service role server-side, so it intentionally bypasses these policies.
create policy "invitation read"
  on invitations for select to authenticated
  using (is_admin() or department_id = auth_department());
create policy "invitation manage"
  on invitations for all to authenticated
  using (is_admin() or (auth_role() = 'DEPARTMENT_HEAD' and department_id = auth_department()))
  with check (is_admin() or (auth_role() = 'DEPARTMENT_HEAD' and department_id = auth_department()));
