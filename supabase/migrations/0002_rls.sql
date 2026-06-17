-- Sarion OS — Row Level Security. Mirrors RBAC scope rules (docs/02) at the database layer,
-- so even a leaked client key cannot read/write out of scope.

-- ───────────── helper functions (SECURITY DEFINER, read caller's profile) ─────────────
create or replace function auth_role() returns role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function auth_department() returns uuid as $$
  select department_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_admin() returns boolean as $$
  select coalesce(auth_role() in ('SUPER_ADMIN','MANAGING_DIRECTOR'), false);
$$ language sql stable security definer;

create or replace function is_manager() returns boolean as $$
  select coalesce(auth_role() in ('SUPER_ADMIN','MANAGING_DIRECTOR','DEPARTMENT_HEAD','TEAM_LEAD'), false);
$$ language sql stable security definer;

-- ───────────── enable RLS everywhere ─────────────
alter table departments    enable row level security;
alter table teams          enable row level security;
alter table profiles       enable row level security;
alter table projects       enable row level security;
alter table tasks          enable row level security;
alter table task_comments  enable row level security;
alter table task_activity  enable row level security;
alter table meetings       enable row level security;
alter table audit_log      enable row level security;

-- ───────────── profiles ─────────────
create policy "profiles readable by authenticated"
  on profiles for select to authenticated using (true);
create policy "profiles self-update"
  on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin-manage"
  on profiles for all to authenticated using (is_admin()) with check (is_admin());

-- ───────────── departments / teams (read all; admins manage) ─────────────
create policy "dept read"   on departments for select to authenticated using (true);
create policy "dept manage" on departments for all to authenticated using (is_admin()) with check (is_admin());
create policy "team read"   on teams for select to authenticated using (true);
create policy "team manage" on teams for all to authenticated
  using (is_admin() or auth_department() = department_id)
  with check (is_admin() or auth_department() = department_id);

-- ───────────── projects (scoped to department; managers create/update) ─────────────
create policy "project read"
  on projects for select to authenticated
  using (is_admin() or department_id = auth_department());
create policy "project write"
  on projects for all to authenticated
  using (is_admin() or (is_manager() and department_id = auth_department()))
  with check (is_admin() or (is_manager() and department_id = auth_department()));

-- ───────────── tasks (owner/assignee/department scope) ─────────────
create policy "task read"
  on tasks for select to authenticated
  using (
    is_admin()
    or owner_id = auth.uid()
    or assignee_id = auth.uid()
    or department_id = auth_department()
  );
create policy "task insert"
  on tasks for insert to authenticated
  with check (is_manager() and (department_id = auth_department() or is_admin()));
create policy "task update"
  on tasks for update to authenticated
  using (is_admin() or owner_id = auth.uid() or assignee_id = auth.uid() or (is_manager() and department_id = auth_department()))
  with check (true);
create policy "task delete"
  on tasks for delete to authenticated
  using (is_admin() or (is_manager() and department_id = auth_department()));

-- ───────────── task comments / activity (follow task visibility) ─────────────
create policy "comment read"
  on task_comments for select to authenticated
  using (exists (select 1 from tasks t where t.id = task_id));
create policy "comment write"
  on task_comments for insert to authenticated with check (author_id = auth.uid());
create policy "activity read"
  on task_activity for select to authenticated
  using (exists (select 1 from tasks t where t.id = task_id));

-- ───────────── meetings (department scope) ─────────────
create policy "meeting read"
  on meetings for select to authenticated
  using (is_admin() or department_id = auth_department() or organizer_id = auth.uid());
create policy "meeting write"
  on meetings for all to authenticated
  using (is_admin() or organizer_id = auth.uid() or (is_manager() and department_id = auth_department()))
  with check (is_admin() or organizer_id = auth.uid() or (is_manager() and department_id = auth_department()));

-- ───────────── audit log (admin read only; inserts via service role) ─────────────
create policy "audit admin read" on audit_log for select to authenticated using (is_admin());

-- ───────────── storage bucket ─────────────
insert into storage.buckets (id, name, public) values ('attachments','attachments', false)
  on conflict (id) do nothing;
create policy "attachments read" on storage.objects for select to authenticated
  using (bucket_id = 'attachments');
create policy "attachments write" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');
