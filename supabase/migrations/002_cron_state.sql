-- Tracks the last signal sent so the cron can deduplicate alerts.
-- One row only — upserted on every cron run.
create table if not exists public.cron_state (
  id           integer primary key default 1 check (id = 1), -- singleton row
  last_signal  text,
  last_crossover text,
  last_alerted_at timestamptz,
  updated_at   timestamptz not null default now()
);

-- Allow the service role to read/write (no user access needed)
alter table public.cron_state enable row level security;
-- No RLS policies = service role only (anon/authenticated cannot access)
