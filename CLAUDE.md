# Bleeps Frontend (bleeps-bot)

## What is this?
Next.js web app for Bleeps - a personal AI assistant. This is the UI layer.

## Architecture
- **Frontend**: This repo - Next.js deployed on Vercel
- **Backend**: bleeps-2 (separate repo) - Express server on Railway
- **Database**: Supabase (PostgreSQL)

## Key Pages
- `/chat` - Main chat interface, talks to bleeps-2 `/api/message`
- `/tasks` - Task list with sections (Today, Tomorrow, Scheduled Reminders, etc.)
- `/inbox` - Notification history (from `notification_log` table)
- `/settings` - User preferences, theme, notification settings
- `/login` - Supabase auth

## Key Files
- `src/app/(app)/` - Authenticated app pages
- `src/app/api/` - API routes (mostly query Supabase directly)
- `src/lib/auth-context.tsx` - Auth state management
- `src/lib/supabase/` - Supabase client setup

## API Routes
- `/api/tasks` - GET/PATCH/DELETE tasks (also deletes from notification_log on complete)
- `/api/inbox` - GET/PATCH/DELETE from notification_log
- `/api/messages` - GET/DELETE conversation history
- `/api/chat` - Proxy to bleeps-2 `/api/message`
- `/api/polls` - GET/POST/DELETE polls
- `/api/polls/vote` - POST to vote on poll option

## Key Concepts
- **Tasks with notifications**: Tasks show badges (⏰ pending, 🔔 sent) if they have `notify_at`
- **Task tags**: Preset (work, personal, shopping, health, finance, home) + custom tags. Claude auto-tags on creation. Filter bar at top of tasks page. Responsive layout (inline on desktop, second row on mobile).
- **Inbox = Notification log**: Shows history of sent notifications, not pending items
- **Completing task deletes its notification** from inbox
- **Polls**: Group chat feature. Single-choice by default. Inline in chat feed at creation time. Creator can delete via three-dot menu.

## Planned Features
- **Group reminders**: "Remind everyone to respond to the poll at 5pm" - creates notification for each group member
- **E2E Encrypted Chats (Private mode)**:
  - Add `encryption_enabled` boolean to chats table
  - Generate keypair on group create, share via invite link
  - Encrypt/decrypt client-side using Web Crypto API
  - @bleeps mentions include message encrypted to server's public key
  - ~1-2 weeks of work
  - Skip "Sealed" (on-chain) mode for now - niche use case

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client-side Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase
- `NEXT_PUBLIC_VAPID_KEY` - Web push (client)
- `BLEEPS_API_URL` - URL to bleeps-2 backend

## Deployment
- Vercel (auto-deploys on push to main)
