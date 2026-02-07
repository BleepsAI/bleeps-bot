# Bleeps Bot

Personal AI assistant for productivity and financial signals.

## Current Status (Feb 7, 2025)

### What's Working
- [x] Next.js 15 web app deployed to Vercel (https://bleeps-bot.vercel.app)
- [x] Supabase auth (magic link login)
- [x] Database schema (users, messages, reminders, tasks, price_alerts)
- [x] Landing page with pricing ($5/$10/$20 tiers)
- [x] Chat UI with message history
- [x] Settings page with Telegram link code display
- [x] OpenClaw Telegram bot running locally (working)

### In Progress
- [ ] Deploy OpenClaw to Railway (cloud hosting)
- [ ] Connect web app to OpenClaw gateway (instead of direct Claude API)
- [ ] Stripe payments integration

### Not Started
- [ ] Telegram bot connection to user accounts
- [ ] WhatsApp integration (Twilio)
- [ ] SMS integration (Twilio)
- [ ] Daily briefings (cron)
- [ ] Reminder scheduling
- [ ] Price alerts
- [ ] Financial signals (investing.xyz)
- [ ] Notion integration (meeting notes)

## Architecture

```
Users (Web, Telegram, WhatsApp, SMS)
            │
            ▼
┌─────────────────────────┐
│   Vercel (Next.js)      │  ← Web app, webhooks, cron
│   bleeps-bot.vercel.app │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Railway (OpenClaw)    │  ← Agent brain, skills, memory
│   Gateway + Pi Agent    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Supabase              │  ← Users, auth, data
│   + Claude API          │  ← NLP/reasoning
│   + Stripe              │  ← Payments
│   + Twilio              │  ← SMS/WhatsApp
└─────────────────────────┘
```

## Pricing Tiers

| Tier | Price | Messages | Reminders | Channels |
|------|-------|----------|-----------|----------|
| Lite | $5/mo | 150/mo | 10 | Telegram |
| Standard | $10/mo | 500/mo | 25 | Telegram + WhatsApp |
| Pro | $20/mo | Unlimited | Unlimited | All + SMS |

14-day free trial for all tiers.

## Environment Variables

### Vercel (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://zfsjswgrbygowfojjbts.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SITE_URL=https://bleeps-bot.vercel.app
```

### Railway (OpenClaw)
```
ANTHROPIC_API_KEY=sk-ant-...
# TBD - other OpenClaw config
```

## Local Development

```bash
npm install
npm run dev    # http://localhost:3000
```

## Deployment

```bash
vercel --prod  # Deploy to Vercel
```

## Key Files

- `/src/app/page.tsx` - Landing page with pricing
- `/src/app/login/page.tsx` - Magic link auth
- `/src/app/(app)/chat/page.tsx` - Chat interface
- `/src/app/(app)/settings/page.tsx` - Settings + Telegram linking
- `/src/app/api/chat/route.ts` - Chat API (currently Claude direct, will switch to OpenClaw)
- `/src/lib/supabase.ts` - Supabase client + types
- `/src/lib/auth-context.tsx` - Auth provider
- `/supabase/schema.sql` - Database schema

## Next Steps

1. Deploy OpenClaw to Railway
2. Update `/api/chat` to call OpenClaw gateway instead of Claude directly
3. Add Stripe checkout
4. Connect Telegram bot to user accounts
5. Add reminders/scheduling
