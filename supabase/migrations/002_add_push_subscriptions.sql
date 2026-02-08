-- Add push_subscriptions table for Web Push notifications
-- Run this in Supabase SQL Editor

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

-- Index for looking up subscriptions by user
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies
create policy "Users can view own push subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "Users can manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id);
