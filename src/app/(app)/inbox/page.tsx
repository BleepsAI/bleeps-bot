'use client'

import { useState, useEffect } from 'react'
import { Bell, Loader2, Trash2, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface NotificationItem {
  id: string
  taskId?: string
  type: string
  title: string
  body?: string
  channel?: string
  sentAt: string
  readAt?: string
  isRead: boolean
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function InboxPage() {
  const { authUser } = useAuth()
  const userId = authUser?.id
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const fetchInbox = async () => {
      try {
        const response = await fetch(`/api/inbox?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setItems(data.items || [])
        }
      } catch (error) {
        console.error('Error fetching inbox:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInbox()
  }, [userId])

  const markAsRead = async (item: NotificationItem) => {
    if (item.isRead) return

    // Optimistic update
    setItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, isRead: true, readAt: new Date().toISOString() } : i)
    )

    try {
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, markAsRead: true })
      })
    } catch (error) {
      console.error('Error marking as read:', error)
      // Revert on error
      setItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, isRead: false, readAt: undefined } : i)
      )
    }
  }

  const deleteItem = async (item: NotificationItem) => {
    const oldItems = items
    setItems(prev => prev.filter(i => i.id !== item.id))

    try {
      await fetch('/api/inbox', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      })
    } catch (error) {
      console.error('Error deleting item:', error)
      setItems(oldItems)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-border bg-background safe-top">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">Bleeps</span>
          <span className="text-base text-muted-foreground">Notifications</span>
        </div>
      </header>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
            <Bell className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">
              Your notification history will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => markAsRead(item)}
                className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/30 group cursor-pointer ${
                  !item.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <div className="mt-0.5 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`${!item.isRead ? 'font-semibold' : 'font-medium'}`}>
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  {item.body && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(item.sentAt)}
                    </span>
                    {item.channel && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {item.channel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!item.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        markAsRead(item)
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteItem(item)
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
