import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set')
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Subscription tiers
export type SubscriptionTier = 'lite' | 'standard' | 'pro'

export const TIER_LIMITS = {
  lite: { messages: 150, reminders: 10, priceAlerts: 2, historyDays: 14 },
  standard: { messages: 500, reminders: 25, priceAlerts: 10, historyDays: 30 },
  pro: { messages: Infinity, reminders: Infinity, priceAlerts: Infinity, historyDays: Infinity },
} as const

export const TIER_PRICES = {
  lite: 5,
  standard: 10,
  pro: 20,
} as const

// Types for our tables
export interface User {
  id: string
  email: string
  telegram_chat_id?: string
  subscription_tier: SubscriptionTier
  subscription_status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  stripe_customer_id?: string
  stripe_subscription_id?: string
  trial_ends_at?: string
  messages_this_month: number
  messages_reset_at: string
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  user_id: string
  title: string
  description?: string
  due_at: string
  completed: boolean
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  due_date?: string
  completed: boolean
  created_at: string
}

export interface PriceAlert {
  id: string
  user_id: string
  asset: string
  condition: 'above' | 'below'
  target_price: number
  triggered: boolean
  created_at: string
}

export interface Message {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  channel: 'web' | 'telegram' | 'whatsapp' | 'sms'
  created_at: string
}

// Helper to check if user is within limits
export function canSendMessage(user: User): boolean {
  const limit = TIER_LIMITS[user.subscription_tier].messages
  return user.messages_this_month < limit
}

export function getActiveRemindersLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier].reminders
}

export function getPriceAlertsLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier].priceAlerts
}
