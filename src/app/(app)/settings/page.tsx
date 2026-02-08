'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, User, Bell, BellOff, Moon, MessageSquare, HelpCircle, LogOut, Copy, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { TIER_LIMITS, TIER_PRICES, type SubscriptionTier } from '@/lib/supabase'
import {
  getPushPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  initializePush,
  type PushPermissionState
} from '@/lib/push-notifications'

export default function SettingsPage() {
  const { user, authUser, signOut } = useAuth()
  const [copied, setCopied] = useState(false)
  const [pushState, setPushState] = useState<PushPermissionState>('default')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  const tier = (user?.subscription_tier || 'lite') as SubscriptionTier
  const limits = TIER_LIMITS[tier]
  const messagesUsed = user?.messages_this_month || 0
  const messagesLimit = limits.messages === Infinity ? 'Unlimited' : limits.messages

  // Check push notification state on mount
  useEffect(() => {
    async function checkPush() {
      if (!authUser?.id) return
      const state = getPushPermissionState()
      setPushState(state)
      if (state === 'granted') {
        const { subscription } = await initializePush(authUser.id)
        setPushEnabled(!!subscription)
      }
    }
    checkPush()
  }, [authUser?.id])

  const handlePushToggle = async () => {
    if (!authUser?.id) return
    setPushLoading(true)

    try {
      if (pushEnabled) {
        await unsubscribeFromPush(authUser.id)
        setPushEnabled(false)
      } else {
        const subscription = await subscribeToPush(authUser.id)
        setPushEnabled(!!subscription)
        setPushState(getPushPermissionState())
      }
    } catch (err) {
      console.error('Push toggle error:', err)
    } finally {
      setPushLoading(false)
    }
  }

  // Generate a link code for Telegram
  const linkCode = user?.id ? `bleeps_${user.id.slice(0, 8)}` : ''

  const copyLinkCode = () => {
    navigator.clipboard.writeText(linkCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border safe-top">
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      {/* Settings list */}
      <div className="flex-1 overflow-y-auto">
        {/* Account overview */}
        <div className="p-4 border-b border-border">
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan</span>
              <p className="font-semibold capitalize">{tier} - ${TIER_PRICES[tier]}/mo</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Messages</span>
              <p className="font-semibold">{messagesUsed} / {messagesLimit}</p>
            </div>
          </div>
          {user?.subscription_status === 'trialing' && user?.trial_ends_at && (
            <p className="mt-2 text-xs text-amber-600">
              Trial ends {new Date(user.trial_ends_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Telegram linking */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Connect Telegram
          </h2>
          {user?.telegram_chat_id ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 bg-green-600/10 px-2 py-1 rounded-full">Connected</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Send this code to @BleepsAIBot on Telegram:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                  /link {linkCode}
                </code>
                <button
                  onClick={copyLinkCode}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {pushEnabled ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {pushState === 'denied'
                    ? 'Blocked in browser settings'
                    : pushState === 'unsupported'
                    ? 'Not supported in this browser'
                    : pushEnabled
                    ? 'Reminders will notify you'
                    : 'Enable to get reminder alerts'}
                </p>
              </div>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={pushLoading || pushState === 'denied' || pushState === 'unsupported'}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                pushEnabled ? 'bg-primary' : 'bg-muted'
              } ${(pushState === 'denied' || pushState === 'unsupported') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  pushEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Other settings */}
        <div className="py-4">
          <div className="divide-y divide-border">
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left">Help & Feedback</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Sign out */}
        <div className="py-4 border-t border-border">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-muted/50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
