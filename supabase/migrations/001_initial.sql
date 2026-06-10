-- ============================================================
-- AI Gold Signal — Initial Schema
-- Run this in the Supabase SQL Editor or via supabase db push
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

-- Public user profiles (mirrors auth.users, auto-populated via trigger)
create table if not exists public.users (
  id          uuid references auth.users (id) on delete cascade primary key,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Gold price snapshots (written by cron job every 5 min)
create table if not exists public.gold_prices (
  id             bigserial primary key,
  price          numeric(12, 4) not null,
  change         numeric(12, 4),
  change_percent numeric(8, 4),
  high           numeric(12, 4),
  low            numeric(12, 4),
  trend          text check (trend in ('up', 'down', 'neutral')),
  recorded_at    timestamptz not null default now()
);

-- AI-generated trading signals
create table if not exists public.ai_signals (
  id               bigserial primary key,
  signal           text not null check (signal in ('BUY', 'SELL', 'HOLD')),
  confidence       integer check (confidence between 0 and 100),
  risk             text check (risk in ('Low', 'Medium', 'High')),
  analysis         text,
  gold_price       numeric(12, 4),
  rsi              numeric(8, 4),
  ema20            numeric(12, 4),
  ema50            numeric(12, 4),
  macd             numeric(12, 4),
  macd_signal      numeric(12, 4),
  macd_histogram   numeric(12, 4),
  macd_crossover   text check (macd_crossover in ('bullish', 'bearish', 'none')),
  created_at       timestamptz not null default now()
);

-- Log of alerts sent to users
create table if not exists public.alert_history (
  id         bigserial primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  signal_id  bigint references public.ai_signals (id) on delete set null,
  channel    text not null default 'telegram',
  success    boolean not null default false,
  sent_at    timestamptz not null default now()
);

-- Per-user alert and Telegram preferences
create table if not exists public.user_settings (
  user_id              uuid primary key references public.users (id) on delete cascade,
  telegram_bot_token   text,
  telegram_chat_id     text,
  alerts_enabled       boolean not null default true,
  min_confidence       integer not null default 75 check (min_confidence between 0 and 100),
  alert_on_crossover   boolean not null default true,
  alert_on_rsi_breakout boolean not null default true,
  updated_at           timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────

create index if not exists gold_prices_recorded_at_idx on public.gold_prices (recorded_at desc);
create index if not exists ai_signals_created_at_idx   on public.ai_signals  (created_at desc);
create index if not exists alert_history_user_id_idx   on public.alert_history (user_id, sent_at desc);

-- ── Trigger: auto-create profile on sign-up ──────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Row Level Security ────────────────────────────────────────

alter table public.users          enable row level security;
alter table public.gold_prices    enable row level security;
alter table public.ai_signals     enable row level security;
alter table public.alert_history  enable row level security;
alter table public.user_settings  enable row level security;

-- users: read + update own row only
create policy "users: read own"   on public.users for select using (auth.uid() = id);
create policy "users: update own" on public.users for update using (auth.uid() = id);

-- gold_prices: all authenticated users can read (market data is public)
create policy "gold_prices: authenticated read"
  on public.gold_prices for select
  using (auth.role() = 'authenticated');

-- ai_signals: all authenticated users can read
create policy "ai_signals: authenticated read"
  on public.ai_signals for select
  using (auth.role() = 'authenticated');

-- alert_history: read own rows only
create policy "alert_history: read own"
  on public.alert_history for select
  using (auth.uid() = user_id);

-- user_settings: full CRUD on own row only
create policy "user_settings: read own"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings: insert own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings: update own"
  on public.user_settings for update
  using (auth.uid() = user_id);
