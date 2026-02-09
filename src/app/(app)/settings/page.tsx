'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, Bell, BellOff, HelpCircle, Trash2, Copy, Check, AtSign, Loader2 } from 'lucide-react'
import {
  getPushPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  initializePush,
  type PushPermissionState
} from '@/lib/push-notifications'

// Get anonymous user ID from localStorage
function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'
  let id = localStorage.getItem('bleeps_user_id')
  if (!id || id.startsWith('anon_')) {
    id = crypto.randomUUID()
    localStorage.setItem('bleeps_user_id', id)
  }
  return id
}

export default function SettingsPage() {
  const [userId, setUserId] = useState<string>('anonymous')
  const [copied, setCopied] = useState(false)
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

  // Get user ID on mount
  useEffect(() => {
    const id = getAnonymousUserId()
    setUserId(id)
  }, [])

  // Fetch current handle on mount
  useEffect(() => {
    async function fetchHandle() {
      if (!userId || userId === 'anonymous') return
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
      if (!userId || userId === 'anonymous') return
      const state = getPushPermissionState()
      setPushState(state)
      if (state === 'granted') {
        const { subscription } = await initializePush(userId)
        setPushEnabled(!!subscription)
      }
    }
    checkPush()
  }, [userId])

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
    if (!userId || userId === 'anonymous') return
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
    navigator.clipboard.writeText(currentHandle ? `@${currentHandle}` : userId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      <header className="px-4 py-3 border-b border-border safe-top">
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      {/* Settings list */}
      <div className="flex-1 overflow-y-auto">
        {/* Your Handle */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your Handle
          </h2>

          {handleLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : currentHandle ? (
            // Has handle - show it with copy button
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-muted px-3 py-2 rounded">
                  <AtSign className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="font-medium">{currentHandle}</span>
                </div>
                <button
                  onClick={copyHandle}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Friends can invite you with @{currentHandle}
              </p>

              {/* Edit handle */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Change handle:</p>
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
                  {handleInput !== currentHandle && (
                    <button
                      onClick={claimHandle}
                      disabled={handleStatus !== 'available' || claiming}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50"
                    >
                      {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </button>
                  )}
                </div>
                {handleInput !== currentHandle && (
                  <div className="mt-1 text-xs">
                    {handleStatus === 'checking' && (
                      <span className="text-muted-foreground">Checking...</span>
                    )}
                    {handleStatus === 'available' && (
                      <span className="text-green-600">Available!</span>
                    )}
                    {(handleStatus === 'taken' || handleStatus === 'invalid') && handleError && (
                      <span className="text-red-500">{handleError}</span>
                    )}
                  </div>
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
                  <span className="text-green-600">@{handleInput} is available!</span>
                )}
                {(handleStatus === 'taken' || handleStatus === 'invalid') && handleError && (
                  <span className="text-red-500">{handleError}</span>
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

        {/* Clear data */}
        <div className="py-4 border-t border-border">
          <button
            onClick={handleClearData}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-muted/50 transition-colors"
          >
            <Trash2 className="h-5 w-5" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>
    </div>
  )
}
