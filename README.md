<div align="center">

# 🪙 AI Gold Signal

**Production-grade AI-powered Gold (XAU/USD) trading signal platform**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?logo=supabase)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?logo=google)](https://aistudio.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live Demo](https://ai-gold-signal.vercel.app) · [Report Bug](https://github.com/hailongnguyen/ai-gold-signal/issues) · [Request Feature](https://github.com/hailongnguyen/ai-gold-signal/issues)

![Dashboard Preview](https://raw.githubusercontent.com/hailongnguyen/ai-gold-signal/main/public/preview.png)

</div>

---

## Overview

AI Gold Signal is a full-stack SaaS dashboard that delivers real-time gold trading signals powered by Gemini 2.5 Flash AI. It combines multi-timeframe technical analysis with AI-generated insights, bilingual EN/VI support, and personalized Telegram alerts — built as a showcase of modern full-stack engineering.

## Features

### Core
- **Multi-timeframe analysis** — 5M, 15M, 1H, 4H, 1D with independent AI signals per timeframe
- **AI Signal Engine** — Gemini 2.5 Flash analyzes RSI, EMA, MACD to generate BUY/SELL/HOLD with confidence score, risk level, Stop Loss, and Take Profit
- **Beginner Mode** — plain-language AI explanations for non-traders via expandable tooltips
- **TradingView chart** — interactive candlestick chart (Lightweight Charts v5)
- **Technical indicators** — RSI(14), EMA(20/50), MACD(12/26/9) calculated locally from Yahoo Finance data

### AI & Commentary
- **Market Commentary** — Gemini-generated bilingual market analysis, refreshed every 30 minutes
- **News Sentiment** — crawls 7 reputable sources (Kitco, Investing.com, Mining.com, MarketWatch, CafeF, VnEconomy), analyzes sentiment + impact with EN/VI summaries
- **AI Copilot Chat** — floating context-aware chatbot with current price/indicators injected into every message

### Platform
- **Bilingual** — full EN/VI support via next-intl with locale-prefixed routes (`/en`, `/vi`)
- **Google OAuth** — one-click sign-in via Supabase Auth
- **Multi-user** — each user has their own settings, preferences, and signal history
- **Telegram alerts** — per-user bot configuration with deduplication (no spam), SL/TP included, EN/VI language
- **Personalized risk profiles** — Conservative / Balanced / Aggressive trading modes
- **Signal history** — full trade log with outcome tracking and win rate stats
- **Redis cache** — Gemini API calls cached (3–60 min by timeframe) to minimize quota usage
- **Framer Motion** — smooth page and card animations throughout

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | TailwindCSS v4 + shadcn/ui v4 + Framer Motion |
| AI | Google Gemini 2.5 Flash |
| Auth & DB | Supabase (PostgreSQL + RLS + Google OAuth) |
| Cache | Redis (ioredis) |
| Charts | TradingView Lightweight Charts v5 |
| Indicators | technicalindicators (RSI, EMA, MACD) |
| Price Data | Yahoo Finance `GC=F` — free, no API key |
| i18n | next-intl v3 |
| Deployment | Vercel |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Next.js 16                        │
│                                                     │
│  proxy.ts ──► Supabase session ──► next-intl i18n  │
│                                                     │
│  /[locale]/        app routes (EN + VI)             │
│  /api/analyze      price + indicators + Gemini AI   │
│  /api/cron         fan-out Telegram alerts          │
│  /api/chat         AI Copilot (context-aware)       │
│  /api/news         RSS crawl + sentiment analysis   │
└──────────┬──────────────────────────────────────────┘
           │
     ┌─────▼──────┐    ┌──────────────┐    ┌────────┐
     │  Supabase  │    │ Gemini 2.5   │    │ Redis  │
     │  Postgres  │    │   Flash      │    │ Cache  │
     │  Auth/RLS  │    │ (AI signals) │    │ 3-60m  │
     └────────────┘    └──────────────┘    └────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/apikey) API key
- A [Redis Cloud](https://cloud.redis.io) database (free tier works)

### Installation

```bash
git clone https://github.com/hailongnguyen/ai-gold-signal.git
cd ai-gold-signal
npm install
cp .env.example .env.local
```

Fill in `.env.local` (see [Environment Variables](#environment-variables)), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/en` automatically.

### Database Setup

Run migrations in order in your **Supabase SQL Editor**:

```
supabase/migrations/001_initial.sql   — core tables + RLS + auth trigger
supabase/migrations/002_cron_state.sql — deduplication for Telegram alerts
supabase/migrations/003_extended_schema.sql — V2: preferences, commentary, news, SL/TP
```

### Auth Setup

1. Supabase Dashboard → **Authentication → Providers → Google** → enable
2. Add OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
3. Add callback URL: `https://<your-project>.supabase.co/auth/v1/callback`
4. Set **Site URL** in Supabase → Authentication → URL Configuration

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-side only — never expose

# AI
GEMINI_API_KEY=<your-gemini-key>

# Redis cache
REDIS_HOST=<your-redis-host>
REDIS_PORT=<port>
REDIS_PASSWORD=<password>

# Telegram (global fallback — users can set their own in Settings)
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_CHAT_ID=<chat-id>

# Cron auth
CRON_SECRET=<random-32-char-string>
```

## API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/gold` | GET | Public | Current price + 200-candle history |
| `/api/analyze` | GET | Public | `?timeframe=5M\|15M\|1H\|4H\|1D` — price + indicators + AI signal |
| `/api/commentary` | GET | Public | Latest EN/VI market commentary |
| `/api/news` | GET | Public | Latest analyzed news with sentiment |
| `/api/chat` | POST | Required | AI Copilot with market context |
| `/api/signal` | GET | Required | Generate + save signal to DB |
| `/api/settings` | GET/POST | Required | User Telegram settings |
| `/api/preferences` | POST | Required | Language + trading mode |
| `/api/cron` | GET | Bearer | Scheduled signal + fan-out alerts |
| `/api/commentary` | POST | Bearer | Generate + save new commentary |
| `/api/news` | POST | Bearer | Fetch + analyze + save news |

## Deployment

### Vercel

```bash
vercel deploy
```

Add all environment variables in **Vercel Dashboard → Settings → Environment Variables**.

The built-in cron (`vercel.json`) runs once daily at 8:00 AM UTC (Hobby plan limit). For frequent Telegram alerts (every 15 min), set up a free external cron at [cron-job.org](https://cron-job.org):

```
URL:     https://your-app.vercel.app/api/cron
Method:  GET
Header:  Authorization: Bearer <CRON_SECRET>
```

### Supabase Redirect URLs

Add to **Supabase → Authentication → URL Configuration → Redirect URLs**:
```
https://your-app.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

## Project Structure

```
ai-gold-signal/
├── app/
│   ├── [locale]/           # Locale-prefixed routes (/en, /vi)
│   │   ├── page.tsx        # Dashboard
│   │   ├── history/        # Signal history + stats
│   │   ├── settings/       # User preferences
│   │   └── login/          # Google OAuth
│   └── api/                # API routes
├── components/
│   ├── Dashboard.tsx        # Main dashboard with Framer Motion
│   ├── GoldChart.tsx        # TradingView candlestick chart
│   ├── dashboard/           # MarketCommentary, NewsSentimentCard, LearningTooltip
│   └── chat/                # AI Copilot floating widget
├── services/
│   ├── gemini.ts            # AI analysis + commentary + chat (with Redis cache)
│   ├── gold.ts              # Yahoo Finance multi-timeframe data
│   ├── telegram.ts          # Bilingual alert sending
│   └── database.ts          # Supabase data access layer
├── lib/
│   ├── redis.ts             # ioredis singleton
│   ├── cache.ts             # Cache-aside helpers with per-timeframe TTLs
│   └── supabase/            # server / client / admin clients
├── i18n/                    # next-intl routing + request config
├── messages/                # en.json + vi.json translations
├── types/                   # TypeScript types + Supabase DB schema
└── supabase/migrations/     # 3 SQL migration files
```

## Screenshots

| Dashboard | Signal Card | AI Copilot | History |
|---|---|---|---|
| _(add screenshot)_ | _(add screenshot)_ | _(add screenshot)_ | _(add screenshot)_ |

## Roadmap

- [ ] Price alerts (custom thresholds, not just AI signals)
- [ ] Portfolio tracker with P&L
- [ ] WebSocket real-time price updates
- [ ] Mobile PWA
- [ ] More assets (Silver, Bitcoin, S&P 500)

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Disclaimer

AI signals and market commentary are for **educational and informational purposes only**. This is not financial advice. Always do your own research before making any investment decisions. Past performance does not guarantee future results.

## License

MIT © [Hai Long Nguyen](https://github.com/hailongnguyen) — see [LICENSE](LICENSE) for details.
