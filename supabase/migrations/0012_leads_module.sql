-- 0012 — Lead Management module (internal outbound sales for the Sarion team).
-- NOT a customer CRM: this tracks agencies the team researches and works through
-- an outbound pipeline (research → import → assign → outreach → demo → won).
--
-- The team is small and all-admin (CEO / Managing Director / Marketing Officer),
-- so RLS follows the 0007 convention: any authenticated profile may read/write.
-- Every status change is audited through the app (audit_log + lead_activities).

-- ───────────── enums ─────────────
create type lead_status as enum (
  'RESEARCH','IMPORTED','ASSIGNED','LINKEDIN_REQUESTED','CONNECTED','COLD_EMAIL_SENT',
  'SOCIAL_DM_SENT','CONVERSATION_STARTED','FOLLOWUP_SCHEDULED','INTERESTED',
  'DEMO_SCHEDULED','DEMO_COMPLETED','PROPOSAL_SENT','NEGOTIATION','WON','LOST','ARCHIVED'
);
create type lead_priority as enum ('HIGH','MEDIUM','LOW');
create type followup_type as enum ('LINKEDIN','EMAIL','CALL','INSTAGRAM','FACEBOOK','X','CUSTOM');

-- ───────────── leads ─────────────
create table leads (
  id uuid primary key default gen_random_uuid(),
  -- company
  agency_name text not null,
  website text,
  country text,
  city text,
  industry text,
  agency_size text,
  services text,
  linkedin_company text,
  -- founder
  founder_name text,
  founder_linkedin text,
  -- contact
  contact_person text,
  position text,
  business_email text,
  phone text,
  instagram text,
  facebook text,
  x_handle text,
  -- pipeline
  status lead_status not null default 'RESEARCH',
  priority lead_priority not null default 'MEDIUM',
  assigned_to uuid references profiles(id) on delete set null,
  research_source text,
  imported_by uuid references profiles(id) on delete set null,
  import_id uuid,
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null,
  -- dates
  last_contact_date date,
  next_followup date,
  demo_date date,
  customer_since date,
  tags text[] not null default '{}',
  -- outreach tracking (manual — no external integrations)
  li_requested_at timestamptz,
  li_connected_at timestamptz,
  li_first_msg_at timestamptz,
  cold_email_sent_at timestamptz,
  cold_email_opened boolean not null default false,
  cold_email_replied_at timestamptz,
  ig_dm_sent_at timestamptz,
  ig_replied_at timestamptz,
  fb_dm_sent_at timestamptz,
  fb_replied_at timestamptz,
  x_dm_sent_at timestamptz,
  x_replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on leads (status);
create index on leads (assigned_to);
create index on leads (priority);
create index on leads (country);
create index on leads (next_followup);
create index on leads (created_at);
-- Case-insensitive uniqueness helpers for duplicate detection during import.
create index on leads (lower(business_email));
create index on leads (lower(agency_name));
create index on leads (lower(website));
create trigger trg_leads_updated before update on leads for each row execute function set_updated_at();

-- ───────────── lead_contacts (extra people at the agency) ─────────────
create table lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  name text not null,
  position text,
  email text,
  phone text,
  linkedin text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index on lead_contacts (lead_id);

-- ───────────── lead_notes ─────────────
create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index on lead_notes (lead_id);

-- ───────────── lead_activities (chronological timeline) ─────────────
create table lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  verb text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index on lead_activities (lead_id);
create index on lead_activities (created_at);

-- ───────────── lead_followups ─────────────
create table lead_followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  type followup_type not null default 'EMAIL',
  due_date date not null,
  note text,
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on lead_followups (lead_id);
create index on lead_followups (due_date, done);
create index on lead_followups (assigned_to);

-- ───────────── lead_tags (catalog of reusable tags) ─────────────
create table lead_tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  color text not null default 'neutral',
  created_at timestamptz not null default now()
);

-- ───────────── lead_imports (CSV import batches) ─────────────
create table lead_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  imported_by uuid references profiles(id) on delete set null,
  total_rows int not null default 0,
  imported_rows int not null default 0,
  skipped_rows int not null default 0,
  duplicate_rows int not null default 0,
  error_rows int not null default 0,
  report jsonb,
  created_at timestamptz not null default now()
);
create index on lead_imports (created_at);

-- leads.import_id → lead_imports (set after the batch row exists)
alter table leads add constraint leads_import_fk
  foreign key (import_id) references lead_imports(id) on delete set null;

-- ───────────── RLS — small all-admin team (mirrors 0007) ─────────────
alter table leads          enable row level security;
alter table lead_contacts  enable row level security;
alter table lead_notes     enable row level security;
alter table lead_activities enable row level security;
alter table lead_followups enable row level security;
alter table lead_tags      enable row level security;
alter table lead_imports   enable row level security;

create policy leads_all           on leads           for all to authenticated using (true) with check (true);
create policy lead_contacts_all   on lead_contacts   for all to authenticated using (true) with check (true);
create policy lead_notes_all      on lead_notes      for all to authenticated using (true) with check (true);
create policy lead_followups_all  on lead_followups  for all to authenticated using (true) with check (true);
create policy lead_tags_all       on lead_tags       for all to authenticated using (true) with check (true);
create policy lead_imports_all    on lead_imports    for all to authenticated using (true) with check (true);
-- lead_activities is append-only from the app (written with the service role,
-- like task_activity); allow authenticated reads so the timeline renders.
create policy lead_activities_read on lead_activities for select to authenticated using (true);
