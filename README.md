# Bleeps

Personal AI assistant that works 24/7 — reaches out when it matters.

**Live:** https://bleeps.ai

## What Is Bleeps?

Not a chatbot you open — an assistant that runs in the background. Create reminders, track spending, coordinate with groups, get notified via web or Telegram.

## Status

| Component | Status | URL |
|-----------|--------|-----|
| Web App | Live | https://bleeps.ai |
| Backend API | Live | https://bleeps-2-production.up.railway.app |
| Telegram Bot | Live | @BleepsAIBot |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
│                    (Web / Telegram)                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js)                          │
│                        bleeps.ai                             │
│  - Auth (Google OAuth + magic link via Supabase)             │
│  - Chat UI with group switcher                               │
│  - Settings (handle, push, Telegram linking)                 │
│  - Inbox & Tasks pages                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Railway (Express API)                     │
│              bleeps-2-production.up.railway.app              │
│  - Claude integration (reasoning)                            │
│  - Tool execution (reminders, tasks, budget, groups)         │
│  - Telegram webhook                                          │
│  - Cron jobs (reminder notifications)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                               │
│  - Users & auth (Google OAuth + magic link)                  │
│  - Messages & conversation history                           │
│  - Chats & chat members (solo + groups)                      │
│  - Reminders, tasks, budget entries                          │
│  - Push subscriptions                                        │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Chat** — Natural language interface powered by Claude
- **Reminders** — Create, list, complete with push/Telegram notifications
- **Tasks** — Track todos with status management (overdue, today, tomorrow, upcoming sections)
- **Budget** — Log expenses, set category limits, view spending
- **Groups** — Shared chats with family, roommates, teams
- **Group Settings** — Edit group name, delete group
- **Handles** — @username system for easy invites (bleeps.ai/@yourname)
- **Public Profiles** — Share your profile at bleeps.ai/@username with "Add to group" and "Join Bleeps" CTAs
- **Push Notifications** — Web push for reminders and invites
- **Telegram** — Chat via @BleepsAIBot, get notifications there too
- **Memory** — Bleeps remembers facts about you across sessions
- **Daily Briefing** — Morning summary with weather, reminders, tasks (saved to chat history)
- **News Briefing** — RSS news from 16 sources (crypto, finance, Australia, general) with configurable delivery times
- **Weather** — Get weather for your location
- **URL Summarization** — Summarize articles and web pages
- **Light/Dark Theme** — Toggle in settings with redesigned toggle switches

## Local Development

```bash
npm install
npm run dev    # http://localhost:3000
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://bleeps.ai
OPENCLAW_GATEWAY_URL=https://bleeps-2-production.up.railway.app
OPENCLAW_GATEWAY_TOKEN=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

## Key Files

| File | Purpose |
|------|---------|
| `/src/app/(app)/chat/page.tsx` | Chat interface with group switcher |
| `/src/app/(app)/settings/page.tsx` | Handle, push, Telegram, daily briefing, news brief, theme settings |
| `/src/app/(app)/inbox/page.tsx` | Reminders & notifications |
| `/src/app/(app)/tasks/page.tsx` | Task management with overdue/today/tomorrow/upcoming sections |
| `/src/app/u/[handle]/page.tsx` | Public profile page (Add to group + Join Bleeps) |
| `/src/middleware.ts` | Auth session + /@username rewrite to /u/username |
| `/src/app/api/handle/route.ts` | Handle availability & claiming |
| `/src/app/api/groups/route.ts` | Group operations (CRUD) |
| `/src/app/api/tasks/route.ts` | Task CRUD |
| `/src/app/api/news/route.ts` | News brief preferences (enabled, sources, times) |
| `/src/app/api/inbox/route.ts` | Unified reminders & tasks API |
| `/src/lib/supabase/middleware.ts` | Auth session management |
| `/src/lib/auth-context.tsx` | Auth state provider |
| `/src/lib/theme-context.tsx` | Theme state provider |
| `/src/lib/push-notifications.ts` | Push subscription management |
| `/src/app/globals.css` | Dynamic viewport height (100dvh) for mobile |

## Roadmap

### Phase 1: Core ✅
- [x] Web app deployed
- [x] Backend API deployed
- [x] Auth (Google OAuth + magic link)
- [x] Custom domain (bleeps.ai)
- [x] Chat with Claude
- [x] Reminders (create, list, complete, delete)
- [x] Tasks (create, list, update, delete)
- [x] Memory system
- [x] Chat message persistence

### Phase 2: Social ✅
- [x] Groups (create, invite, join)
- [x] Group settings (edit name, delete)
- [x] User handles (@username)
- [x] Push notifications
- [x] Telegram bot integration (@BleepsAIBot)
- [x] Multi-channel notifications (web push + Telegram)

### Phase 3: Intelligence ✅
- [x] Daily briefing (saved to chat history)
- [x] News briefing (16 RSS sources, multiple delivery times)
- [x] Weather module
- [x] URL summarization
- [x] Budget tracking

### Phase 3.5: Public Profiles ✅
- [x] /@username URL support via middleware rewrite
- [x] Public profile page with "Add to group" CTA
- [x] "Join Bleeps" referral landing for new users
- [x] Mobile viewport fixes (100dvh)
- [x] Toggle switch redesign for light/dark mode
- [x] Tasks page with overdue section and fixed date logic

### Phase 4: Integrations (Planned)
- [ ] Google Places (local recommendations)
- [ ] Google Calendar (bidirectional)
- [ ] Gmail (read inbox, create drafts)
- [ ] Slack (multi-workspace, bidirectional)
- [ ] Stripe payments

### Phase 5: Privacy (Planned)
- [ ] User-controlled privacy levels per chat
- [ ] E2E encryption for Private chats
- [ ] Wallet-based identity option

## Related Repos

- [bleeps-2](https://github.com/shivmadan/bleeps-2) — Backend API (Express)
