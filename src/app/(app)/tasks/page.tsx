'use client'

import { useState, useEffect, useRef } from 'react'
import { Circle, CheckCircle2, Loader2, ListTodo, MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: string
  createdAt: string
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

function getSection(task: Task): 'today' | 'tomorrow' | 'upcoming' | 'completed' | 'no-date' {
  if (task.completed) return 'completed'
  if (!task.dueDate) return 'no-date'

  const due = new Date(task.dueDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86400000)
  const dayAfter = new Date(today.getTime() + 86400000 * 2)

  if (due < dayAfter && due >= today) return 'today'
  if (due >= dayAfter && due < new Date(today.getTime() + 86400000 * 2)) return 'tomorrow'
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
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'no-date', label: 'No Due Date' },
  { key: 'completed', label: 'Completed' },
] as const

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      const userId = getAnonymousUserId()
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
  }, [])

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
    setEditingId(task.id)
    setEditValue(task.title)
    setMenuOpenId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (taskId: string) => {
    if (!editValue.trim()) return

    const oldTask = tasks.find(t => t.id === taskId)
    if (!oldTask || oldTask.title === editValue.trim()) {
      cancelEdit()
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

  const groupedTasks = sections.map(section => ({
    ...section,
    tasks: tasks.filter(t => getSection(t) === section.key)
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border safe-top">
        <h1 className="text-lg font-semibold">Tasks</h1>
      </header>

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
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
                                if (e.key === 'Enter') saveEdit(task.id)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              className="flex-1 text-sm bg-muted px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                              onClick={() => saveEdit(task.id)}
                              className="p-1 text-green-600 hover:bg-muted rounded"
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
                          <span
                            className={`text-sm ${
                              task.completed ? 'text-muted-foreground line-through' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                        )}
                      </div>
                      {task.dueDate && !task.completed && editingId !== task.id && (
                        <span className="text-xs text-muted-foreground">
                          {formatDueDate(task.dueDate)}
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
                            <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                              <button
                                onClick={() => startEdit(task)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-muted"
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
