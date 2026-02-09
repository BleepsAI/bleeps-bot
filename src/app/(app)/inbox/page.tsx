'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCircle, Clock, Loader2 } from 'lucide-react'

type FilterType = 'all' | 'reminders' | 'tasks'

interface InboxItem {
  id: string
  type: 'reminder' | 'task'
  title: string
  description?: string
  time: string
  status: string
  chatId: string
  chatName: string
  priority?: string
}

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

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'tasks', label: 'Tasks' },
]

function getIcon(type: InboxItem['type']) {
  switch (type) {
    case 'reminder':
      return <Bell className="h-5 w-5" />
    case 'task':
      return <CheckCircle className="h-5 w-5" />
  }
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  // Past
  if (diffMs < 0) {
    if (diffMins > -60) return `${Math.abs(diffMins)}m ago`
    if (diffHours > -24) return `${Math.abs(diffHours)}h ago`
    if (diffDays > -7) return `${Math.abs(diffDays)}d ago`
    return date.toLocaleDateString()
  }

  // Future
  if (diffMins < 60) return `in ${diffMins}m`
  if (diffHours < 24) return `in ${diffHours}h`
  if (diffDays < 7) return `in ${diffDays}d`
  return date.toLocaleDateString()
}

export default function InboxPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInbox = async () => {
      const userId = getAnonymousUserId()
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
  }, [])

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'reminders') return item.type === 'reminder'
    if (filter === 'tasks') return item.type === 'task'
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border safe-top">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">Inbox</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
            <Bell className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">No items yet</p>
            <p className="text-sm mt-1">
              Your reminders and tasks will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="mt-0.5 text-primary">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    {item.priority === 'high' && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                        High
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(item.time)}
                    </span>
                    {item.chatName !== 'Personal' && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {item.chatName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
