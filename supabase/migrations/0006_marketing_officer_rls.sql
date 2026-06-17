-- Grant Marketing Officer "manager-like" scope at the RLS layer so its
-- task:create / project:create / meeting:create permissions (lib/rbac.ts)
-- actually work against the database. Run AFTER 0005 (separate execution).
create or replace function is_manager() returns boolean as $$
  select coalesce(
    auth_role() in (
      'SUPER_ADMIN','MANAGING_DIRECTOR','DEPARTMENT_HEAD','TEAM_LEAD','MARKETING_OFFICER'
    ),
    false
  );
$$ language sql stable security definer;
