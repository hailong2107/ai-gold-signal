<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AI Gold Signal — Project Reference

## Stack
- **Next.js 15** (App Router, `app/` directory) — `"use client"` required for browser code
- **TypeScript** strict mode — run `tsc --noEmit` before finishing any task
- **Supabase** — Postgres + Auth. Admin client (`lib/supabase/admin.ts`) for server-side DB ops
- **Redis** (Upstash via `lib/cache.ts`) — cache signals, headlines, commentary
- **TradingView Lightweight Charts v5** — `chart.addSeries(SeriesType, opts, paneIndex?)` — NOT deprecated v4 API
- **@google/generative-ai** — Gemini SDK, uses `callGemini()` helper (see below)
- **next-intl** — i18n with `messages/en.json` + `messages/vi.json`

## Key directories
```
app/
  api/
    analyze/route.ts   — main signal endpoint (price + indicators + AI signal + alerts)
    cron/route.ts      — scheduled job: signal + commentary + news refresh
    news/route.ts      — RSS fetch + Gemini sentiment analysis
    telegram/route.ts  — alert dispatch + test/diagnostic endpoint
    commentary/route.ts
    gold/route.ts      — raw price + OHLC history
services/
  gemini.ts            — all Gemini calls, model fallback chain
  alerts.ts            — Telegram fan-out with dedup logic  ← see BUG FIXES below
  telegram.ts          — message builder + sendMessage()
  database.ts          — all Supabase reads/writes
  gold.ts              — Yahoo Finance price fetch
utils/
  indicators.ts        — calculateIndicators() + calculateIndicatorSeries()
components/
  Dashboard.tsx        — lazy-loads GoldChart, MarketCommentary, NewsSentimentCard, CopilotChat
  GoldChart.tsx        — 3-pane chart: candlestick+EMA, RSI, MACD
types/index.ts         — all shared types incl. IndicatorSeries
```

---

## Gemini model fallback chain (`services/gemini.ts`)

`callGemini(prompt)` iterates this list on rate-limit errors (429 / RESOURCE_EXHAUSTED):

```
gemini-2.5-flash  →  gemini-2.0-flash  →  gemma-4-31b-it  →  gemma-3-27b-it
  →  gemini-1.5-flash  →  gemini-1.5-flash-8b  →  gemma-3-12b-it
```

- Non-rate-limit errors surface immediately (no retry)
- Gemma models (`gemma-*`) are **free tier with generous quotas** on Google AI Studio

---

## GoldChart — multi-pane layout (`components/GoldChart.tsx`)

| Pane | Content |
|------|---------|
| 0 (main) | Candlestick + EMA20 (amber) + EMA50 (blue) |
| 1 | RSI(14) — violet line, OB/OS reference lines at 70/30 |
| 2 | MACD histogram (green/red) + MACD line (cyan) + Signal line (orange) |

`IndicatorSeries` is calculated server-side in `calculateIndicatorSeries()` and returned by `/api/analyze`.

---

## BUG FIXES — critical logic (do not revert)

### FIX 7 — History: `outcome` column always null (`services/database.ts`, `app/api/cron/route.ts`)

**Problem:** The `outcome` field on `ai_signals` was never set — no code evaluated whether a BUY/SELL signal hit take_profit or stop_loss. History page showed "—" for every row.

**Fix:** Added `evaluateSignalOutcomes(currentPrice)` in `database.ts`:
- Queries all `ai_signals` rows where `outcome IS NULL` and TP/SL are set
- For BUY: if `currentPrice >= take_profit` → `outcome = "win"`, if `<= stop_loss` → `"loss"`
- For SELL: reversed logic
- Called from cron on every run alongside other tasks — result returned as `outcomesUpdated` in cron response

---

### FIX 6 — Telegram: `void maybeSendAlerts()` killed by Vercel before running (`app/api/analyze/route.ts`)

**Problem:** `void maybeSendAlerts()` fire-and-forget is terminated immediately when the HTTP response is sent on Vercel serverless. The function never ran — zero logs, zero Telegram messages.

**Fix:** Use `after()` from `next/server` (Next.js 15+). `after()` registers a callback that runs **after the response is sent**, and Vercel keeps the function instance alive until it completes.

```ts
import { NextResponse, after } from "next/server";
// ...
after(async () => {
  await maybeSendAlerts(signal, price, indicators);
});
```

Never use `void asyncFn()` for background work in Next.js API routes on serverless — use `after()` instead.

---

### FIX 1 — Telegram: HOLD was being sent + dedup was wrong (`services/alerts.ts`)

**Problem:** Old cron sent HOLD signals to Telegram. Also `shouldAlert` had `|| cooldownOk` which re-sent the same BUY/SELL signal every 30 minutes regardless of signal change.

**Fix in `maybeSendAlerts()`:**
- HOLD → return early, never send, only update `cron_state`
- `signalChanged` = current signal is BUY or SELL AND differs from `prevState.last_signal` → fires **immediately**, no cooldown
- MACD crossover / RSI breakout → fires only if `msSinceLast >= 30 min` (prevents spam)

```ts
const shouldAlert =
  signalChanged ||                        // BUY/SELL changed — always fire
  (newCrossover && cooldownOk) ||         // crossover, but respect cooldown
  (rsiBreakout && cooldownOk);            // RSI extreme, but respect cooldown
```

### FIX 3 — Telegram: `user_preferences!inner` silently excluded users (`services/database.ts`)

**Problem:** `getAllAlertUsersWithPrefs()` used `user_preferences!inner(language)` (INNER JOIN). Any user with `alerts_enabled = true` but no row in `user_preferences` was silently excluded — no Telegram message ever sent.

**Fix:** Changed to LEFT JOIN: `.select("*, user_preferences(language)")` — users without preferences row default to locale `"en"`.

### FIX 4 — Telegram: `parse_mode: "HTML"` caused silent 400 rejections (`services/telegram.ts`)

**Problem:** Telegram API rejects messages with `parse_mode: "HTML"` if text contains unescaped `<`, `>`, or `&`. Gemini analysis text regularly contains these. `sendMessage` caught the error but returned `false` silently — no logs, no delivery.

**Fix:** Removed `parse_mode` entirely — plain text delivery. Added error logging: logs full Telegram response body on failure and logs `sent=ok signal=X chatId=...` on every attempt.

### FIX 2 — News: "No news available" all day (`app/api/news/route.ts`)

**Problem:** `GET /api/news` only read from DB (`getLatestNews()`). `POST /api/news` (RSS fetch + Gemini analysis) was auth-gated and never called by the cron. DB was always empty → UI showed "No news available".

**Fix:**
- `GET /api/news` now checks DB freshness (< 2 hours). If empty or stale → calls `fetchAndAnalyzeNews()` inline before returning
- `POST /api/news` (cron-auth) still exists for background refresh
- Cron route (`app/api/cron/route.ts`) now calls `POST /api/news` on every run to keep news fresh

---

## Alert flow summary

```
Dashboard polls /api/analyze every 60s
  → AI returns BUY or SELL
    → void maybeSendAlerts()   ← fire-and-forget, does not block HTTP response
        → getCronState()       ← dedup check
        → if signalChanged → fan-out to all alert subscribers via sendTelegramAlert()
        → saveCronState()      ← update last_signal / last_alerted_at
```

---

## Test Telegram bot

```bash
# Check config + cron state
GET /api/telegram?secret=CRON_SECRET

# Send a live test message to the configured bot
GET /api/telegram?secret=CRON_SECRET&send=1
```

---

## Environment variables

| Key | Required | Notes |
|-----|----------|-------|
| `GEMINI_API_KEY` | ✅ | Google AI Studio key |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side admin operations |
| `UPSTASH_REDIS_REST_URL` | ✅ | |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | |
| `CRON_SECRET` | ✅ | Bearer token for `/api/cron`, `/api/news` POST, `/api/telegram` GET |
| `TELEGRAM_BOT_TOKEN` | optional | Default bot (env fallback for per-user bot tokens) |
| `TELEGRAM_CHAT_ID` | optional | Default chat ID |
| `NEXT_PUBLIC_SITE_URL` | optional | Used by cron to self-call `/api/news` POST |

---

## Timestamps

All `HistoricalPrice.time` values must be cast as `UTCTimestamp` for Lightweight Charts v5.
All Gemini calls must go through `callGemini(prompt)` — never call `model.generateContent()` directly.
