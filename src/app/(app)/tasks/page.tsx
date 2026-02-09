'use client'

import { useState, useEffect } from 'react'
import { Circle, CheckCircle2, Loader2, ListTodo } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  dueDate?: string
  chatId: string
  chatName: string
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
  if (task.status === 'done') return 'completed'
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

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done'

    // Optimistic update
    setTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
    )

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, status: newStatus })
      })
    } catch (error) {
      console.error('Error updating task:', error)
      // Revert on error
      setTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, status: task.status } : t)
      )
    }
  }

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
                      onClick={() => toggleTask(task)}
                      className="flex items-start gap-3 py-2 cursor-pointer group"
                    >
                      <button className="flex-shrink-0 text-muted-foreground group-hover:text-foreground mt-0.5">
                        {task.status === 'done' ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${
                              task.status === 'done' ? 'text-muted-foreground line-through' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.priority === 'high' && task.status !== 'done' && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                              High
                            </span>
                          )}
                        </div>
                        {task.chatName !== 'Personal' && (
                          <span className="text-xs text-muted-foreground">
                            {task.chatName}
                          </span>
                        )}
                      </div>
                      {task.dueDate && task.status !== 'done' && (
                        <span className="text-xs text-muted-foreground">
                          {formatDueDate(task.dueDate)}
                        </span>
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
