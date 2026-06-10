# AI Gold Signal

AI-powered gold (XAU/USD) trading dashboard with real-time technical analysis, Gemini AI signals, Supabase multi-user auth, and per-user Telegram alerts.

## Features

- **Google OAuth auth** — one-click sign in, protected dashboard
- **Real-time gold price** — auto-refreshes every 30 seconds
- **Technical indicators** — RSI, EMA20, EMA50, MACD
- **AI signal analysis** — Gemini AI generates BUY/SELL/HOLD with confidence + risk
- **Per-user Telegram alerts** — each user configures their own bot and thresholds
- **Signal history** — every signal stored in Supabase
- **Row-level security** — users can only see and modify their own data
- **TradingView chart** — interactive candlestick chart

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in .env.local — Supabase and Gemini keys are required
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in **SQL Editor**:
   ```
   supabase/migrations/001_initial.sql
   ```
3. Enable **Google OAuth** in Authentication → Providers → Google
4. Add callback URL: `https://your-project.supabase.co/auth/v1/callback`
5. Add your site URL to Authentication → URL Configuration → Site URL

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `GEMINI_API_KEY` | Yes | [AI Studio](https://aistudio.google.com/apikey) |
| `TELEGRAM_BOT_TOKEN` | No | Global fallback bot (users set their own in Settings) |
| `TELEGRAM_CHAT_ID` | No | Global fallback chat ID |
| `GOLD_API_KEY` | No | [MetalPriceAPI](https://metalpriceapi.com) key |
| `CRON_SECRET` | No | Bearer secret for `/api/cron` |

## Database Schema

| Table | Description |
|---|---|
| `users` | User profiles (auto-created from auth.users via trigger) |
| `gold_prices` | Gold price snapshots written by cron |
| `ai_signals` | AI-generated BUY/SELL/HOLD signals with indicator snapshot |
| `alert_history` | Log of alerts sent per user |
| `user_settings` | Per-user Telegram credentials and alert preferences |

All tables have **Row Level Security** — users access only their own data.

## API Routes

| Route | Auth | Description |
|---|---|---|
| `GET /api/gold` | Public | Current gold price + history |
| `GET /api/analyze` | Public | Price + indicators + AI signal |
| `GET /api/signal` | Required | Generate signal, save to DB, send user's Telegram |
| `POST /api/telegram` | Public | Manual Telegram alert (uses global env vars) |
| `GET /api/settings` | Required | Get user settings |
| `POST /api/settings` | Required | Save user settings |
| `GET /api/cron` | Bearer token | Cron job — fan-out alerts to all subscribed users |

## Deploy to Vercel

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables in Vercel dashboard
4. Add `https://your-app.vercel.app/auth/callback` to Supabase allowed redirect URLs
5. Deploy — cron runs every 5 minutes automatically

## Tech Stack

- Next.js 16 App Router — `proxy.ts` (middleware)
- TypeScript strict
- TailwindCSS + shadcn/ui v4
- Supabase (Auth + Postgres + RLS)
- Gemini AI 2.0 Flash
- TradingView Lightweight Charts v5
- technicalindicators

## Disclaimer

AI signals are for educational purposes only. Not financial advice.
