'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCircle, Loader2, MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

type FilterType = 'all' | 'reminders' | 'tasks'

interface InboxItem {
  id: string
  type: 'reminder' | 'task'
  title: string
  description?: string
  time: string
  status: string
  chatName: string
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
  const { authUser } = useAuth()
  const userId = authUser?.id
  const [filter, setFilter] = useState<FilterType>('all')
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null)
    if (menuOpenId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [menuOpenId])

  const startEdit = (item: InboxItem) => {
    setEditingId(item.id)
    setEditValue(item.title)
    setMenuOpenId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (item: InboxItem) => {
    if (!editValue.trim() || item.title === editValue.trim()) {
      cancelEdit()
      return
    }

    const oldItems = items
    setItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, title: editValue.trim() } : i)
    )
    setEditingId(null)

    try {
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type: item.type, title: editValue.trim() })
      })
    } catch (error) {
      console.error('Error updating item:', error)
      setItems(oldItems)
    }
  }

  const deleteItem = async (item: InboxItem) => {
    const oldItems = items
    setItems(prev => prev.filter(i => i.id !== item.id))
    setMenuOpenId(null)

    try {
      await fetch('/api/inbox', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type: item.type })
      })
    } catch (error) {
      console.error('Error deleting item:', error)
      setItems(oldItems)
    }
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'reminders') return item.type === 'reminder'
    if (filter === 'tasks') return item.type === 'task'
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-border bg-background safe-top">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">Bleeps</span>
          <span className="text-base text-muted-foreground">Inbox</span>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
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
                className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/30 group"
              >
                <div className="mt-0.5 text-primary">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(item)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="flex-1 text-sm bg-muted px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={() => saveEdit(item)}
                        className="p-1 text-green-500 hover:bg-muted rounded"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-muted-foreground hover:bg-muted rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{item.title}</span>
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
                    </>
                  )}
                </div>
                {editingId !== item.id && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(menuOpenId === item.id ? null : item.id)
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {menuOpenId === item.id && (
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-10 py-1 min-w-[120px]">
                        <button
                          onClick={() => startEdit(item)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-muted transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
