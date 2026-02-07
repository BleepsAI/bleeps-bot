# Bleeps

Personal AI assistant for productivity and financial signals.

**Live:** https://bleeps-bot.vercel.app

## What Is Bleeps?

A personal AI assistant that works 24/7. Not a chatbot you open — an assistant that runs in the background and reaches out when it matters.

## Status

| Component | Status | URL |
|-----------|--------|-----|
| Web App | Live | https://bleeps-bot.vercel.app |
| Backend API | Live | https://bleeps-2-production.up.railway.app |
| Auth | Working | Supabase magic link |
| Chat | Working | Claude API |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
│                    (Web / Mobile / Telegram)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js)                          │
│                    bleeps-bot.vercel.app                     │
│  - Landing page & auth                                       │
│  - Chat UI                                                   │
│  - Settings / subscription management                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Railway (Express API)                     │
│              bleeps-2-production.up.railway.app              │
│  - Claude integration (reasoning)                            │
│  - Tool execution                                            │
│  - Session management                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                               │
│  - Users & auth                                              │
│  - Conversation history                                      │
│  - Reminders, tasks, notes                                   │
│  - Price alerts, portfolio data                              │
│  - User memory & preferences                                 │
└─────────────────────────────────────────────────────────────┘
```

## Technical Approach

Claude as the orchestrator with modular tools:

- **Core Tools:** Reminders, tasks, notes
- **Financial Tools:** Price alerts, portfolio tracking (custom built)
- **Adapted OpenClaw Skills:** Memory, learning, daily briefing
- **Future:** Calendar, email, third-party integrations

All tools store data in Supabase, scoped per user (multi-tenant).

## Pricing

| Tier | Price | Messages | Reminders | Price Alerts |
|------|-------|----------|-----------|--------------|
| Lite | $5/mo | 150/mo | 10 | 2 |
| Standard | $10/mo | 500/mo | 25 | 10 |
| Pro | $20/mo | Unlimited | Unlimited | Unlimited |

14-day free trial for all tiers.

## Local Development

```bash
npm install
npm run dev    # http://localhost:3000
```

## Environment Variables

### Vercel
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://bleeps-bot.vercel.app
OPENCLAW_GATEWAY_URL=https://bleeps-2-production.up.railway.app
OPENCLAW_GATEWAY_TOKEN=
```

## Key Files

| File | Purpose |
|------|---------|
| `/src/app/page.tsx` | Landing page |
| `/src/app/login/page.tsx` | Magic link auth |
| `/src/app/(app)/chat/page.tsx` | Chat interface |
| `/src/app/api/chat/route.ts` | Chat API → Railway |
| `/src/lib/supabase.ts` | Supabase client |
| `/src/lib/auth-context.tsx` | Auth provider |
| `/supabase/schema.sql` | Database schema |

## Roadmap

### Phase 1: Core (Current)
- [x] Web app deployed
- [x] Backend API deployed
- [x] Auth working
- [x] Basic chat working
- [ ] Core tools (reminders, tasks, notes)
- [ ] Price alerts

### Phase 2: Intelligence
- [ ] Memory system
- [ ] Daily briefing
- [ ] Learning system

### Phase 3: Channels
- [ ] Telegram bot
- [ ] Push notifications
- [ ] WhatsApp

### Phase 4: Integrations
- [ ] Google Calendar
- [ ] Gmail
- [ ] Notion

## Related Repos

- [bleeps-2](https://github.com/shivmadan/bleeps-2) — Backend API (Express)
