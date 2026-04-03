# TrackMint - Smart Portfolio Tracker

A production-ready, multi-asset portfolio tracker and trading journal. Track stocks, crypto, gold, and silver in one dashboard — with real-time P/L, price alerts, market news, and daily email digests.

**100% free to build. 100% free to run.**

## Features

- **Multi-Asset Tracking** — Stocks (Finnhub), Crypto (CoinGecko), Metals (GoldAPI)
- **Real-Time P/L** — See unrealized gains/losses update as markets move
- **Trading Journal** — Log daily P/L with strategy tags, calendar heatmap, win rate
- **Price Alerts** — Set above/below targets, email notifications with cooldown
- **Daily Digest** — Morning email with portfolio snapshot, movers, and news
- **Market News** — Asset-specific news with sentiment analysis
- **Multi-User SaaS** — Registration, authentication, private portfolios
- **Dark Fintech Theme** — Professional UI with glassmorphism, charts, and responsive design

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Charts | Recharts, TradingView Lightweight Charts |
| Database | PostgreSQL via Supabase (free tier) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Cache | Upstash Redis (free tier) |
| Email | Resend (free tier — 100/day) |
| Cron | cron-job.org (free, 1-min intervals) |
| Hosting | Vercel (free Hobby tier) |

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> trackmint
cd trackmint
npm install
```

### 2. Set up services (all free)

1. **Supabase** — [supabase.com](https://supabase.com) → New project → Get URL + anon key + service role key
2. **Upstash Redis** — [upstash.com](https://upstash.com) → Create Redis database → Get REST URL + token
3. **Resend** — [resend.com](https://resend.com) → Sign up → Get API key
4. **Finnhub** — [finnhub.io](https://finnhub.io) → Sign up → Get free API key
5. **CoinGecko** — [coingecko.com/api](https://www.coingecko.com/en/api) → Get demo API key
6. **GoldAPI** — [goldapi.io](https://www.goldapi.io) → Sign up → Get free API key
7. **MarketAux** — [marketaux.com](https://www.marketaux.com) → Sign up → Get API token

### 3. Configure environment

```bash
cp .env.example .env
# Fill in all the API keys from step 2
```

### 4. Set up database

```bash
npx prisma generate
npx prisma db push
npm run db:seed    # Seeds demo assets (AAPL, BTC, XAU, etc.)
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — register an account and start tracking.

## Set Up 24/7 Price Monitoring

After deploying to Vercel, set up free cron jobs at [cron-job.org](https://cron-job.org):

| Job | URL | Interval | Method |
|---|---|---|---|
| Refresh Prices | `https://your-app.vercel.app/api/cron/refresh-prices` | Every 5 min | POST |
| Check Alerts | `https://your-app.vercel.app/api/cron/check-alerts` | Every 5 min | POST |
| Refresh News | `https://your-app.vercel.app/api/cron/refresh-news` | Every 30 min | POST |
| Send Digests | `https://your-app.vercel.app/api/cron/send-digests` | Daily 6 AM | POST |
| Health/Keep-alive | `https://your-app.vercel.app/api/cron/health` | Every 5 min | GET |

Add this header to all POST cron jobs:
```
Authorization: Bearer YOUR_CRON_SECRET
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel
# Set environment variables in Vercel dashboard
```

## Monthly Cost

| Service | Cost |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Upstash Redis Free | $0 |
| Resend Free | $0 |
| cron-job.org | $0 |
| All market data APIs | $0 |
| **Total** | **$0/month** |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Forgot Password
│   ├── (dashboard)/     # Dashboard, Watchlist, Portfolio, Journal, Alerts, Settings, Asset Detail
│   ├── api/             # API routes (assets, watchlists, holdings, journal, alerts, dashboard, cron)
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Landing page
├── components/
│   ├── ui/              # Button, Card, Input, Badge, Dialog, Tabs, etc.
│   ├── dashboard/       # StatsCards, AllocationChart, PerformanceChart, TopMovers, RecentNews
│   └── shared/          # Sidebar, Providers
├── lib/
│   ├── providers/       # StocksProvider, CryptoProvider, MetalsProvider, NewsProvider
│   ├── supabase/        # Client and server Supabase clients
│   ├── db.ts            # Prisma client
│   ├── redis.ts         # Upstash Redis + caching helpers
│   ├── email.ts         # Resend email client
│   └── utils.ts         # Formatting, P/L calculation, helpers
├── hooks/               # useUser, useToast
└── types/               # TypeScript interfaces
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Demo asset seeder
```

## Disclaimer

TrackMint is for **informational and tracking purposes only**. It does not execute trades, hold funds, or provide financial advice. Market data may be delayed. Always verify with your broker before making investment decisions.
