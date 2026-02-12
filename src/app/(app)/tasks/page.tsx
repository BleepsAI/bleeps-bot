'use client'

import { useState, useEffect, useRef } from 'react'
import { Circle, CheckCircle2, Loader2, ListTodo, MoreVertical, Pencil, Trash2, X, Check, Tag, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: string
  notifyAt?: string
  notified?: boolean
  tags: string[]
  createdAt: string
}

const PRESET_TAGS = ['work', 'personal', 'shopping', 'health', 'finance', 'home']

function getSection(task: Task): 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'completed' | 'scheduled' | 'no-date' {
  if (task.completed) return 'completed'

  // Tasks with notify_at but no due_date go to "scheduled"
  if (task.notifyAt && !task.dueDate) return 'scheduled'

  if (!task.dueDate) return 'no-date'

  const due = new Date(task.dueDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86400000)
  const dayAfter = new Date(tomorrow.getTime() + 86400000)

  // Overdue: due date is before today
  if (due < today) return 'overdue'
  // Today: due date is today
  if (due < tomorrow) return 'today'
  // Tomorrow: due date is tomorrow
  if (due < dayAfter) return 'tomorrow'
  // Upcoming: anything further out
  return 'upcoming'
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((date.getTime() - today.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const sections = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'scheduled', label: 'Scheduled Reminders' },
  { key: 'no-date', label: 'No Due Date' },
  { key: 'completed', label: 'Completed' },
] as const

export default function TasksPage() {
  const { authUser } = useAuth()
  const userId = authUser?.id
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [editModalTask, setEditModalTask] = useState<Task | null>(null)
  const [editModalTitle, setEditModalTitle] = useState('')
  const [editModalTags, setEditModalTags] = useState<string[]>([])
  const [editModalDueDate, setEditModalDueDate] = useState('')
  const [editModalNotifyAt, setEditModalNotifyAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [customTagInput, setCustomTagInput] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!userId) return
    const fetchTasks = async () => {
      try {
        const response = await fetch(`/api/tasks?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setTasks(data.tasks || [])
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [userId])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  const toggleTask = async (task: Task) => {
    const newCompleted = !task.completed

    // Optimistic update
    setTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t)
    )

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, completed: newCompleted })
      })
    } catch (error) {
      console.error('Error updating task:', error)
      // Revert on error
      setTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t)
      )
    }
  }

  const startEdit = (task: Task) => {
    setEditModalTask(task)
    setEditModalTitle(task.title)
    setEditModalTags(task.tags || [])
    setEditModalDueDate(task.dueDate ? task.dueDate.split('T')[0] : '')
    setEditModalNotifyAt(task.notifyAt ? task.notifyAt.slice(0, 16) : '')
    setCustomTagInput('')
    setMenuOpenId(null)
  }

  const cancelEdit = () => {
    setEditModalTask(null)
    setEditModalTitle('')
    setEditModalTags([])
    setEditModalDueDate('')
    setEditModalNotifyAt('')
  }

  const saveEditModal = async () => {
    if (!editModalTask || !editModalTitle.trim()) return

    setSaving(true)
    const updates = {
      taskId: editModalTask.id,
      title: editModalTitle.trim(),
      tags: editModalTags,
      dueDate: editModalDueDate || null,
      notifyAt: editModalNotifyAt || null
    }

    // Optimistic update
    setTasks(prev =>
      prev.map(t => t.id === editModalTask.id ? {
        ...t,
        title: editModalTitle.trim(),
        tags: editModalTags,
        dueDate: editModalDueDate || undefined,
        notifyAt: editModalNotifyAt || undefined
      } : t)
    )

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setSaving(false)
      cancelEdit()
    }
  }

  const toggleTag = (tag: string) => {
    setEditModalTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const addCustomTag = () => {
    const tag = customTagInput.trim().toLowerCase()
    if (tag && !editModalTags.includes(tag)) {
      setEditModalTags(prev => [...prev, tag])
    }
    setCustomTagInput('')
  }

  const startInlineEdit = (task: Task) => {
    setEditingId(task.id)
    setEditValue(task.title)
  }

  const cancelInlineEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveInlineEdit = async (taskId: string) => {
    if (!editValue.trim()) return

    const oldTask = tasks.find(t => t.id === taskId)
    if (!oldTask || oldTask.title === editValue.trim()) {
      cancelInlineEdit()
      return
    }

    // Optimistic update
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, title: editValue.trim() } : t)
    )
    setEditingId(null)

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, title: editValue.trim() })
      })
    } catch (error) {
      console.error('Error updating task:', error)
      // Revert on error
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, title: oldTask.title } : t)
      )
    }
  }

  const deleteTask = async (taskId: string) => {
    const oldTasks = tasks

    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setMenuOpenId(null)

    try {
      await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      })
    } catch (error) {
      console.error('Error deleting task:', error)
      // Revert on error
      setTasks(oldTasks)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null)
    if (menuOpenId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [menuOpenId])

  // Get all unique tags from tasks
  const allTags = [...new Set(tasks.flatMap(t => t.tags || []))]

  // Filter tasks by selected tag
  const filteredTasks = filterTag
    ? tasks.filter(t => t.tags?.includes(filterTag))
    : tasks

  const groupedTasks = sections.map(section => ({
    ...section,
    tasks: filteredTasks
      .filter(t => getSection(t) === section.key)
      .sort((a, b) => {
        // Sort by due date, then notify_at, then created_at (earliest first)
        const aDate = a.dueDate || a.notifyAt || a.createdAt
        const bDate = b.dueDate || b.notifyAt || b.createdAt
        return new Date(aDate).getTime() - new Date(bDate).getTime()
      })
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-border bg-background safe-top">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">Bleeps</span>
          <span className="text-base text-muted-foreground">Tasks</span>
        </div>
      </header>

      {/* Filter bar */}
      {allTags.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-border overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterTag(null)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                filterTag === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                  filterTag === tag
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalTask && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={cancelEdit} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-card border border-border rounded-2xl shadow-xl z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Task</h2>
              <button onClick={cancelEdit} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Task
                </label>
                <input
                  type="text"
                  value={editModalTitle}
                  onChange={(e) => setEditModalTitle(e.target.value)}
                  className="w-full mt-2 px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        editModalTags.includes(tag)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {/* Show custom tags that aren't in presets */}
                  {editModalTags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
                {/* Add custom tag */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomTag()
                      }
                    }}
                    placeholder="Add custom tag..."
                    className="flex-1 px-3 py-1.5 bg-muted rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={addCustomTag}
                    disabled={!customTagInput.trim()}
                    className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editModalDueDate}
                  onChange={(e) => setEditModalDueDate(e.target.value)}
                  className="w-full mt-2 px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Reminder */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Reminder
                </label>
                <input
                  type="datetime-local"
                  value={editModalNotifyAt}
                  onChange={(e) => setEditModalNotifyAt(e.target.value)}
                  className="w-full mt-2 px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={cancelEdit}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEditModal}
                disabled={saving || !editModalTitle.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
            <ListTodo className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">No tasks yet</p>
            <p className="text-sm mt-1">
              Create tasks in chat by saying &quot;add a task to...&quot;
            </p>
          </div>
        ) : (
          groupedTasks.map((section) => {
            if (section.tasks.length === 0) return null

            return (
              <div key={section.key} className="mb-6">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {section.label}
                </h2>
                <div className="space-y-1">
                  {section.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 py-2 group relative"
                    >
                      <button
                        onClick={() => toggleTask(task)}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground mt-0.5"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        {editingId === task.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(task.id)
                                if (e.key === 'Escape') cancelInlineEdit()
                              }}
                              className="flex-1 text-sm bg-muted px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                              onClick={() => saveInlineEdit(task.id)}
                              className="p-1 text-green-500 hover:bg-muted rounded"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="p-1 text-muted-foreground hover:bg-muted rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className="flex items-center gap-1.5">
                              <span
                                className={task.completed ? 'text-muted-foreground line-through' : 'font-medium'}
                              >
                                {task.title}
                              </span>
                              {task.notifyAt && !task.completed && (
                                <span title={task.notified ? 'Notification sent' : 'Notification pending'}>
                                  {task.notified ? '🔔' : '⏰'}
                                </span>
                              )}
                            </span>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {task.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {task.dueDate && !task.completed && editingId !== task.id && (
                        <span className="text-xs text-muted-foreground">
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                      {!task.dueDate && task.notifyAt && !task.completed && editingId !== task.id && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.notifyAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                      {editingId !== task.id && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpenId(menuOpenId === task.id ? null : task.id)
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {menuOpenId === task.id && (
                            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-10 py-1 min-w-[120px]">
                              <button
                                onClick={() => startEdit(task)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
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
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
