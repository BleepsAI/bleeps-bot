-- Add user_profiles table for timezone, display name, and notification preferences
-- Run this in Supabase SQL Editor

-- User profiles table
create table if not exists public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users on delete cascade unique not null,
  display_name text,
  timezone text not null default 'America/New_York',
  notification_preferences jsonb not null default '{"reminders": true, "daily_summary": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index
create index if not exists idx_user_profiles_user_id on public.user_profiles(user_id);

-- Enable RLS
alter table public.user_profiles enable row level security;

-- Policies
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = user_id);

create policy "Users can manage own profile" on public.user_profiles
  for all using (auth.uid() = user_id);

-- Add notified column to reminders if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'reminders' and column_name = 'notified'
  ) then
    alter table public.reminders add column notified boolean not null default false;
  end if;
end $$;
