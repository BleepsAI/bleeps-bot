'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, Bell, BellOff, HelpCircle, Trash2, Copy, Check, AtSign, Loader2, Pencil, X, Send, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import {
  getPushPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  initializePush,
  type PushPermissionState
} from '@/lib/push-notifications'

export default function SettingsPage() {
  const { authUser, signOut } = useAuth()
  const userId = authUser?.id
  const { theme, toggleTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [telegramCopied, setTelegramCopied] = useState(false)
  const [pushState, setPushState] = useState<PushPermissionState>('default')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  // Handle state
  const [currentHandle, setCurrentHandle] = useState<string | null>(null)
  const [handleInput, setHandleInput] = useState('')
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [handleError, setHandleError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [handleLoading, setHandleLoading] = useState(true)
  const [isEditingHandle, setIsEditingHandle] = useState(false)

  // Daily briefing state
  const [briefingEnabled, setBriefingEnabled] = useState(false)
  const [briefingTime, setBriefingTime] = useState('08:00')
  const [briefingLoading, setBriefingLoading] = useState(false)

  // Fetch current handle on mount
  useEffect(() => {
    async function fetchHandle() {
      if (!userId) return
      try {
        const response = await fetch(`/api/handle?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.handle) {
            setCurrentHandle(data.handle)
            setHandleInput(data.handle)
          }
        }
      } catch (error) {
        console.error('Error fetching handle:', error)
      } finally {
        setHandleLoading(false)
      }
    }
    fetchHandle()
  }, [userId])

  // Check push notification state on mount
  useEffect(() => {
    async function checkPush() {
      if (!userId) return
      const state = getPushPermissionState()
      setPushState(state)
      if (state === 'granted') {
        const { subscription } = await initializePush(userId)
        setPushEnabled(!!subscription)
      }
    }
    checkPush()
  }, [userId])

  // Fetch daily briefing preferences
  useEffect(() => {
    async function fetchBriefing() {
      if (!userId) return
      try {
        const response = await fetch(`/api/briefing?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setBriefingEnabled(data.enabled)
          setBriefingTime(data.time?.slice(0, 5) || '08:00')
        }
      } catch (error) {
        console.error('Error fetching briefing prefs:', error)
      }
    }
    fetchBriefing()
  }, [userId])

  const handleBriefingToggle = async () => {
    if (!userId) return
    setBriefingLoading(true)
    const newEnabled = !briefingEnabled

    try {
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, enabled: newEnabled })
      })
      if (response.ok) {
        setBriefingEnabled(newEnabled)
      }
    } catch (error) {
      console.error('Error toggling briefing:', error)
    } finally {
      setBriefingLoading(false)
    }
  }

  const handleBriefingTimeChange = async (newTime: string) => {
    if (!userId) return
    setBriefingTime(newTime)

    try {
      await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, time: newTime })
      })
    } catch (error) {
      console.error('Error updating briefing time:', error)
    }
  }

  // Debounced handle availability check
  const checkHandle = useCallback(async (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, '')

    if (clean.length < 3) {
      setHandleStatus('invalid')
      setHandleError('Handle must be at least 3 characters')
      return
    }

    if (clean.length > 15) {
      setHandleStatus('invalid')
      setHandleError('Handle must be 15 characters or less')
      return
    }

    if (!/^[a-z0-9]/.test(clean)) {
      setHandleStatus('invalid')
      setHandleError('Handle must start with a letter or number')
      return
    }

    // If it's the current handle, it's available
    if (clean === currentHandle) {
      setHandleStatus('available')
      setHandleError(null)
      return
    }

    setHandleStatus('checking')
    setHandleError(null)

    try {
      const response = await fetch(`/api/handle?handle=${clean}`)
      const data = await response.json()

      if (data.available) {
        setHandleStatus('available')
        setHandleError(null)
      } else {
        setHandleStatus('taken')
        setHandleError(data.reason || 'This handle is not available')
      }
    } catch (error) {
      console.error('Handle check error:', error)
      setHandleStatus('idle')
    }
  }, [currentHandle])

  // Debounce handle input
  useEffect(() => {
    if (!handleInput || handleInput === currentHandle) {
      setHandleStatus('idle')
      setHandleError(null)
      return
    }

    const timer = setTimeout(() => {
      checkHandle(handleInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [handleInput, checkHandle, currentHandle])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setHandleInput(value)
  }

  const claimHandle = async () => {
    if (handleStatus !== 'available' || !handleInput) return

    setClaiming(true)
    try {
      const response = await fetch('/api/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, handle: handleInput })
      })

      const data = await response.json()

      if (data.success) {
        setCurrentHandle(data.handle)
        setHandleStatus('idle')
      } else {
        setHandleError(data.error || 'Failed to claim handle')
        setHandleStatus('taken')
      }
    } catch (error) {
      console.error('Claim handle error:', error)
      setHandleError('Failed to claim handle')
    } finally {
      setClaiming(false)
    }
  }

  const handlePushToggle = async () => {
    if (!userId) return
    setPushLoading(true)

    try {
      if (pushEnabled) {
        await unsubscribeFromPush(userId)
        setPushEnabled(false)
      } else {
        const subscription = await subscribeToPush(userId)
        setPushEnabled(!!subscription)
        setPushState(getPushPermissionState())
      }
    } catch (err) {
      console.error('Push toggle error:', err)
    } finally {
      setPushLoading(false)
    }
  }

  const copyHandle = () => {
    navigator.clipboard.writeText(currentHandle ? `bleeps.ai/@${currentHandle}` : (userId || ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const telegramLinkCode = userId ? `bleeps_${userId.slice(0, 8)}` : ''

  const copyTelegramCode = () => {
    navigator.clipboard.writeText(`/link ${telegramLinkCode}`)
    setTelegramCopied(true)
    setTimeout(() => setTelegramCopied(false), 2000)
  }

  const startEditingHandle = () => {
    setHandleInput(currentHandle || '')
    setIsEditingHandle(true)
    setHandleStatus('idle')
    setHandleError(null)
  }

  const cancelEditingHandle = () => {
    setHandleInput(currentHandle || '')
    setIsEditingHandle(false)
    setHandleStatus('idle')
    setHandleError(null)
  }

  const saveHandle = async () => {
    if (handleStatus !== 'available' || !handleInput || handleInput === currentHandle) return

    setClaiming(true)
    try {
      const response = await fetch('/api/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, handle: handleInput })
      })

      const data = await response.json()

      if (data.success) {
        setCurrentHandle(data.handle)
        setIsEditingHandle(false)
        setHandleStatus('idle')
      } else {
        setHandleError(data.error || 'Failed to save handle')
        setHandleStatus('taken')
      }
    } catch (error) {
      console.error('Save handle error:', error)
      setHandleError('Failed to save handle')
    } finally {
      setClaiming(false)
    }
  }

  const handleClearData = () => {
    if (confirm('This will clear all your local data and start fresh. Are you sure?')) {
      localStorage.clear()
      window.location.href = '/chat'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center px-4 h-14 border-b border-border bg-background safe-top">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">Bleeps</span>
          <span className="text-base text-muted-foreground">Settings</span>
        </div>
      </header>

      {/* Settings list */}
      <div className="flex-1 overflow-y-auto">
        {/* Your Handle */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Your Handle
          </h2>

          {handleLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : currentHandle && !isEditingHandle ? (
            // Has handle - display mode
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-muted px-3 py-2 rounded">
                  <AtSign className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="font-medium">{currentHandle}</span>
                </div>
                <button
                  onClick={copyHandle}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Copy profile link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={startEditingHandle}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Edit handle"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Share your profile: bleeps.ai/@{currentHandle}
              </p>
            </div>
          ) : currentHandle && isEditingHandle ? (
            // Has handle - edit mode
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={handleInputChange}
                    maxLength={15}
                    autoFocus
                    className="w-full pl-7 pr-3 py-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="yourhandle"
                  />
                </div>
                <button
                  onClick={saveHandle}
                  disabled={handleStatus !== 'available' || claiming || handleInput === currentHandle}
                  className="p-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
                  title="Save"
                >
                  {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={cancelEditingHandle}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs">
                {handleInput === currentHandle ? (
                  <span className="text-muted-foreground">Current handle</span>
                ) : handleStatus === 'checking' ? (
                  <span className="text-muted-foreground">Checking...</span>
                ) : handleStatus === 'available' ? (
                  <span className="text-green-500">Available!</span>
                ) : (handleStatus === 'taken' || handleStatus === 'invalid') && handleError ? (
                  <span className="text-red-400">{handleError}</span>
                ) : (
                  <span className="text-muted-foreground">3-15 characters, letters, numbers, and underscores</span>
                )}
              </div>
            </div>
          ) : (
            // No handle - show claim UI
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Claim your unique handle so friends can easily invite you to groups
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={handleInputChange}
                    maxLength={15}
                    className="w-full pl-7 pr-3 py-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="yourhandle"
                  />
                </div>
                <button
                  onClick={claimHandle}
                  disabled={handleStatus !== 'available' || claiming}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50"
                >
                  {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Claim'}
                </button>
              </div>
              <div className="text-xs">
                {handleStatus === 'checking' && (
                  <span className="text-muted-foreground">Checking availability...</span>
                )}
                {handleStatus === 'available' && (
                  <span className="text-green-500">@{handleInput} is available!</span>
                )}
                {(handleStatus === 'taken' || handleStatus === 'invalid') && handleError && (
                  <span className="text-red-400">{handleError}</span>
                )}
                {handleStatus === 'idle' && handleInput.length === 0 && (
                  <span className="text-muted-foreground">3-15 characters, letters, numbers, and underscores</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
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
                <p className="text-sm text-muted-foreground">
                  {pushState === 'denied'
                    ? 'Blocked in browser settings'
                    : pushState === 'unsupported'
                    ? 'Not supported in this browser'
                    : pushEnabled
                    ? 'Get notified for reminders & invites'
                    : 'Enable to get alerts'}
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

        {/* Daily Briefing */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Daily Briefing
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className={`h-5 w-5 ${briefingEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium">Morning Summary</p>
                  <p className="text-sm text-muted-foreground">
                    {briefingEnabled
                      ? `Daily at ${briefingTime}`
                      : 'Get a summary of your day each morning'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleBriefingToggle}
                disabled={briefingLoading}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  briefingEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    briefingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {briefingEnabled && (
              <div className="flex items-center gap-3 pl-8">
                <label htmlFor="briefing-time" className="text-sm text-muted-foreground">
                  Send at:
                </label>
                <input
                  id="briefing-time"
                  type="time"
                  value={briefingTime}
                  onChange={(e) => handleBriefingTimeChange(e.target.value)}
                  className="bg-muted border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                <p className="text-sm text-muted-foreground">
                  {theme === 'dark' ? 'Easy on the eyes' : 'Bright and clean'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Telegram */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Telegram
          </h2>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Get notifications on Telegram and chat with Bleeps directly in the app.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium">1. Open @BleepsAIBot on Telegram</p>
              <a
                href="https://t.me/BleepsAIBot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-[#0088cc] text-white rounded text-sm font-medium hover:bg-[#0077b5] transition-colors"
              >
                <Send className="h-4 w-4" />
                Open Telegram Bot
              </a>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium">2. Send this command to link your account:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                  /link {telegramLinkCode}
                </code>
                <button
                  onClick={copyTelegramCode}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Copy command"
                >
                  {telegramCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
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

        {/* Sign out & Clear data */}
        <div className="py-4 border-t border-border">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
          <button
            onClick={handleClearData}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-muted/50 transition-colors"
          >
            <Trash2 className="h-5 w-5" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>
    </div>
  )
}
