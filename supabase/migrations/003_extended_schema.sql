-- ================================================================
-- Migration 003 — Extended schema for v2 features
-- Run in Supabase SQL Editor after migration 002
-- ================================================================

-- ── User Preferences (language, trading mode, timeframe) ─────

create table if not exists public.user_preferences (
  user_id          uuid primary key references public.users(id) on delete cascade,
  language         text not null default 'en' check (language in ('en', 'vi')),
  trading_mode     text not null default 'balanced'
                   check (trading_mode in ('conservative', 'balanced', 'aggressive')),
  preferred_timeframe text not null default '1H',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── AI Market Commentary (generated every 30 min by cron) ────

create table if not exists public.ai_commentary (
  id           bigserial primary key,
  content_en   text not null,
  content_vi   text not null,
  sentiment    text check (sentiment in ('bullish', 'bearish', 'neutral')),
  timeframe    text default '1H',
  gold_price   numeric(12, 4),
  created_at   timestamptz not null default now()
);

create index if not exists ai_commentary_created_at_idx
  on public.ai_commentary (created_at desc);

-- ── News Sentiment ────────────────────────────────────────────

create table if not exists public.news_sentiment (
  id            bigserial primary key,
  headline      text not null,
  source        text,
  url           text,
  sentiment     text check (sentiment in ('bullish', 'bearish', 'neutral')),
  summary_en    text,
  summary_vi    text,
  impact_score  integer check (impact_score between 1 and 10),
  published_at  timestamptz,
  analyzed_at   timestamptz not null default now()
);

create index if not exists news_sentiment_analyzed_at_idx
  on public.news_sentiment (analyzed_at desc);

-- ── Extend ai_signals with v2 columns ────────────────────────

alter table public.ai_signals
  add column if not exists timeframe          text default '1H',
  add column if not exists stop_loss          numeric(12, 4),
  add column if not exists take_profit        numeric(12, 4),
  add column if not exists beginner_explanation text,
  add column if not exists outcome            text
                            check (outcome in ('win', 'loss', 'open', 'cancelled')),
  add column if not exists outcome_price      numeric(12, 4),
  add column if not exists outcome_at         timestamptz;

-- ── RLS ──────────────────────────────────────────────────────

alter table public.user_preferences  enable row level security;
alter table public.ai_commentary     enable row level security;
alter table public.news_sentiment    enable row level security;

-- user_preferences: read/write own row only
create policy "user_preferences: select own"
  on public.user_preferences for select using (auth.uid() = user_id);
create policy "user_preferences: insert own"
  on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "user_preferences: update own"
  on public.user_preferences for update using (auth.uid() = user_id);

-- ai_commentary: all authenticated users can read
create policy "ai_commentary: authenticated read"
  on public.ai_commentary for select using (auth.role() = 'authenticated');

-- news_sentiment: all authenticated users can read
create policy "news_sentiment: authenticated read"
  on public.news_sentiment for select using (auth.role() = 'authenticated');

-- ── Auto-create user_preferences on signup (update trigger) ──

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

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
