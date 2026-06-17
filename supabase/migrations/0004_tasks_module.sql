-- Sarion OS — Task Management module. Extends the existing tasks / task_comments
-- / task_activity tables (0001) with attachments, watchers, and dependencies.
-- RLS follows task visibility (admins all; owner/assignee/department scope).

-- ───────────── helper: can the caller see a given task? ─────────────
create or replace function can_see_task(tid uuid) returns boolean as $$
  select exists (
    select 1 from tasks t
    where t.id = tid
      and (
        is_admin()
        or t.owner_id = auth.uid()
        or t.assignee_id = auth.uid()
        or t.department_id = auth_department()
      )
  );
$$ language sql stable security definer;

-- ───────────── attachments ─────────────
create table task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  uploader_id uuid references profiles(id),
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  created_at timestamptz not null default now()
);
create index on task_attachments (task_id);

-- ───────────── watchers ─────────────
create table task_watchers (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index on task_watchers (user_id);

-- ───────────── dependencies (task depends_on blocker) ─────────────
create table task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);
create index on task_dependencies (task_id);
create index on task_dependencies (depends_on_task_id);

-- ───────────── RLS ─────────────
alter table task_attachments  enable row level security;
alter table task_watchers     enable row level security;
alter table task_dependencies enable row level security;

create policy "attachment read"  on task_attachments for select to authenticated using (can_see_task(task_id));
create policy "attachment write" on task_attachments for insert to authenticated with check (uploader_id = auth.uid() and can_see_task(task_id));
create policy "attachment delete" on task_attachments for delete to authenticated using (uploader_id = auth.uid() or is_admin());

create policy "watcher read"   on task_watchers for select to authenticated using (can_see_task(task_id));
create policy "watcher add"    on task_watchers for insert to authenticated with check ((user_id = auth.uid() or is_manager()) and can_see_task(task_id));
create policy "watcher remove" on task_watchers for delete to authenticated using (user_id = auth.uid() or is_manager());

create policy "dependency read"  on task_dependencies for select to authenticated using (can_see_task(task_id));
create policy "dependency write" on task_dependencies for insert to authenticated with check (is_manager() and can_see_task(task_id));
create policy "dependency delete" on task_dependencies for delete to authenticated using (is_manager() and can_see_task(task_id));

-- Allow comment authors' visibility to follow task visibility precisely
-- (tightens the 0002 "comment read" which only checked task existence).
drop policy if exists "comment read" on task_comments;
create policy "comment read" on task_comments for select to authenticated using (can_see_task(task_id));
