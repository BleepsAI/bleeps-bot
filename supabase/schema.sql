-- Bleeps Database Schema
-- Run this in Supabase SQL Editor (SQL Editor → New Query → Paste → Run)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  telegram_chat_id text unique,
  subscription_tier text not null default 'lite' check (subscription_tier in ('lite', 'standard', 'pro')),
  subscription_status text not null default 'trialing' check (subscription_status in ('active', 'cancelled', 'past_due', 'trialing')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  messages_this_month integer not null default 0,
  messages_reset_at timestamptz not null default date_trunc('month', now()) + interval '1 month',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages table
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  channel text not null default 'web' check (channel in ('web', 'telegram', 'whatsapp', 'sms')),
  created_at timestamptz not null default now()
);

-- Reminders table
create table public.reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users on delete cascade not null,
  title text not null,
  description text,
  due_at timestamptz not null,
  completed boolean not null default false,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tasks table
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users on delete cascade not null,
  title text not null,
  description text,
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Price alerts table
create table public.price_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users on delete cascade not null,
  asset text not null,
  condition text not null check (condition in ('above', 'below')),
  target_price decimal not null,
  triggered boolean not null default false,
  created_at timestamptz not null default now()
);

-- User memory table (for AI personalization)
create table public.user_memory (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users on delete cascade not null,
  fact text not null,
  category text not null default 'other' check (category in ('preference', 'personal', 'work', 'health', 'financial', 'other')),
  source text not null default 'conversation',
  created_at timestamptz not null default now()
);

-- User profiles table (for display name, timezone, preferences)
create table public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users on delete cascade unique not null,
  display_name text,
  timezone text not null default 'America/New_York',
  notification_preferences jsonb not null default '{"reminders": true, "daily_summary": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index idx_messages_user_id on public.messages(user_id);
create index idx_messages_created_at on public.messages(created_at desc);
create index idx_reminders_user_id on public.reminders(user_id);
create index idx_reminders_due_at on public.reminders(due_at) where not completed;
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_price_alerts_user_id on public.price_alerts(user_id);
create index idx_users_telegram_chat_id on public.users(telegram_chat_id);
create index idx_user_memory_user_id on public.user_memory(user_id);
create index idx_user_memory_category on public.user_memory(category);
create index idx_user_profiles_user_id on public.user_profiles(user_id);

-- Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.messages enable row level security;
alter table public.reminders enable row level security;
alter table public.tasks enable row level security;
alter table public.price_alerts enable row level security;
alter table public.user_memory enable row level security;
alter table public.user_profiles enable row level security;

-- Policies: Users can only access their own data
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can view own messages" on public.messages
  for select using (auth.uid() = user_id);

create policy "Users can insert own messages" on public.messages
  for insert with check (auth.uid() = user_id);

create policy "Users can view own reminders" on public.reminders
  for select using (auth.uid() = user_id);

create policy "Users can manage own reminders" on public.reminders
  for all using (auth.uid() = user_id);

create policy "Users can view own tasks" on public.tasks
  for select using (auth.uid() = user_id);

create policy "Users can manage own tasks" on public.tasks
  for all using (auth.uid() = user_id);

create policy "Users can view own price alerts" on public.price_alerts
  for select using (auth.uid() = user_id);

create policy "Users can manage own price alerts" on public.price_alerts
  for all using (auth.uid() = user_id);

create policy "Users can view own memories" on public.user_memory
  for select using (auth.uid() = user_id);

create policy "Users can manage own memories" on public.user_memory
  for all using (auth.uid() = user_id);

create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = user_id);

create policy "Users can manage own profile" on public.user_profiles
  for all using (auth.uid() = user_id);

-- Function to create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to reset monthly message counts (run via cron)
create or replace function public.reset_monthly_messages()
returns void as $$
begin
  update public.users
  set
    messages_this_month = 0,
    messages_reset_at = date_trunc('month', now()) + interval '1 month'
  where messages_reset_at <= now();
end;
$$ language plpgsql security definer;
