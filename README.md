# Bleeps

Personal AI assistant that works 24/7 — reaches out when it matters.

**Live:** https://bleeps-bot.vercel.app

## What Is Bleeps?

Not a chatbot you open — an assistant that runs in the background. Create reminders, track spending, coordinate with groups, get notified via web or Telegram.

## Status

| Component | Status | URL |
|-----------|--------|-----|
| Web App | Live | https://bleeps-bot.vercel.app |
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
│                    bleeps-bot.vercel.app                     │
│  - Chat UI with group switcher                               │
│  - Settings (handle, push, Telegram linking)                 │
│  - Inbox & Tasks pages                                       │
│  - API routes for handles, groups, tasks                     │
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
│  - Users & profiles (handles, Telegram linking)              │
│  - Messages & conversation history                           │
│  - Chats & chat members (solo + groups)                      │
│  - Reminders, tasks, budget entries                          │
│  - Push subscriptions                                        │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Chat** — Natural language interface powered by Claude
- **Reminders** — Create, list, complete with push/Telegram notifications
- **Tasks** — Track todos with status management
- **Budget** — Log expenses, set category limits, view spending
- **Groups** — Shared chats with family, roommates, teams
- **Handles** — @username system for easy invites (bleeps.ai/@yourname)
- **Push Notifications** — Web push for reminders and invites
- **Telegram** — Chat via @BleepsAIBot, get notifications there too
- **Memory** — Bleeps remembers facts about you across sessions

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
NEXT_PUBLIC_SITE_URL=https://bleeps-bot.vercel.app
OPENCLAW_GATEWAY_URL=https://bleeps-2-production.up.railway.app
OPENCLAW_GATEWAY_TOKEN=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

## Key Files

| File | Purpose |
|------|---------|
| `/src/app/(app)/chat/page.tsx` | Chat interface with group switcher |
| `/src/app/(app)/settings/page.tsx` | Handle, push, Telegram settings |
| `/src/app/(app)/inbox/page.tsx` | Reminders & notifications |
| `/src/app/(app)/tasks/page.tsx` | Task management |
| `/src/app/api/handle/route.ts` | Handle availability & claiming |
| `/src/app/api/groups/route.ts` | Group operations |
| `/src/app/api/tasks/route.ts` | Task CRUD |
| `/src/lib/push-notifications.ts` | Push subscription management |

## Roadmap

### Phase 1: Core ✅
- [x] Web app deployed
- [x] Backend API deployed
- [x] Chat with Claude
- [x] Reminders & tasks
- [x] Memory system

### Phase 2: Social ✅
- [x] Groups (create, invite, join)
- [x] User handles (@username)
- [x] Push notifications
- [x] Telegram bot integration

### Phase 3: Finance (In Progress)
- [x] Budget tracking
- [ ] Price alerts
- [ ] Portfolio tracking

### Phase 4: Privacy (Planned)
- [ ] User-controlled privacy levels per chat
- [ ] E2E encryption for Private chats
- [ ] Wallet-based identity option

## Related Repos

- [bleeps-2](https://github.com/shivmadan/bleeps-2) — Backend API (Express)
