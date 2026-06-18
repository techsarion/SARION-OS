-- 0009 — Recurring meetings.
-- A meeting can repeat Daily / Weekly / Monthly. On creation the app generates the
-- concrete future occurrences (each its own `meetings` row) and ties them together
-- via `series_id` so a series can be recognised and managed as a group.

create type meeting_recurrence as enum ('NONE','DAILY','WEEKLY','MONTHLY');

alter table meetings add column if not exists recurrence meeting_recurrence not null default 'NONE';
alter table meetings add column if not exists series_id uuid;

create index if not exists meetings_series_idx on meetings (series_id);
