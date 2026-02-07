'use client'

import { useState } from 'react'
import { Bell, CheckCircle, Clock, TrendingUp } from 'lucide-react'

type FilterType = 'all' | 'reminders' | 'tasks' | 'signals'

interface InboxItem {
  id: string
  type: 'reminder' | 'task' | 'signal' | 'briefing'
  title: string
  description?: string
  time: string
  read: boolean
}

// Mock data - will be replaced with Supabase
const mockItems: InboxItem[] = [
  {
    id: '1',
    type: 'reminder',
    title: 'Call with investor in 1 hour',
    description: 'Prepare talking points for Series A discussion',
    time: '2:00 PM',
    read: false,
  },
  {
    id: '2',
    type: 'briefing',
    title: 'Daily Briefing',
    description: '3 tasks today, 2 meetings scheduled',
    time: '8:00 AM',
    read: true,
  },
  {
    id: '3',
    type: 'task',
    title: 'Follow-up email sent',
    description: 'Email to client confirmed delivered',
    time: 'Yesterday',
    read: true,
  },
]

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'signals', label: 'Signals' },
]

function getIcon(type: InboxItem['type']) {
  switch (type) {
    case 'reminder':
      return <Bell className="h-5 w-5" />
    case 'task':
      return <CheckCircle className="h-5 w-5" />
    case 'signal':
      return <TrendingUp className="h-5 w-5" />
    case 'briefing':
      return <Clock className="h-5 w-5" />
  }
}

export default function InboxPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [items, setItems] = useState(mockItems)

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'reminders') return item.type === 'reminder' || item.type === 'briefing'
    if (filter === 'tasks') return item.type === 'task'
    if (filter === 'signals') return item.type === 'signal'
    return true
  })

  const markAsRead = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
  }

  const unreadCount = items.filter((item) => !item.read).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border safe-top">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <button
              onClick={() => setItems((prev) => prev.map((i) => ({ ...i, read: true })))}
              className="text-sm text-primary"
            >
              Mark all read
            </button>
          )}
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
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No items in inbox
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={`flex gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  !item.read ? 'bg-primary/5' : ''
                }`}
              >
                <div className={`mt-0.5 ${!item.read ? 'text-primary' : 'text-muted-foreground'}`}>
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!item.read ? 'text-foreground' : ''}`}>
                      {item.title}
                    </span>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {item.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
