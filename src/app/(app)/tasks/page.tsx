'use client'

import { useState } from 'react'
import { Plus, Circle, CheckCircle2 } from 'lucide-react'

interface Task {
  id: string
  title: string
  dueDate?: string
  dueTime?: string
  completed: boolean
  section: 'today' | 'tomorrow' | 'upcoming' | 'completed'
}

// Mock data - will be replaced with Supabase
const mockTasks: Task[] = [
  { id: '1', title: 'Team standup', dueTime: '10:00am', completed: false, section: 'today' },
  { id: '2', title: 'Call with investor', dueTime: '2:00pm', completed: false, section: 'today' },
  { id: '3', title: 'Pick up dry cleaning', completed: false, section: 'today' },
  { id: '4', title: 'Follow up with Sarah', dueTime: '9:00am', completed: false, section: 'tomorrow' },
  { id: '5', title: 'Submit expense report', completed: false, section: 'tomorrow' },
  { id: '6', title: "Mom's birthday", dueDate: 'Mar 15', completed: false, section: 'upcoming' },
  { id: '7', title: 'Quarterly review', dueDate: 'Mar 20', completed: false, section: 'upcoming' },
  { id: '8', title: 'Send proposal to client', completed: true, section: 'completed' },
  { id: '9', title: 'Book flights', completed: true, section: 'completed' },
]

const sections = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed Today' },
] as const

export default function TasksPage() {
  const [tasks, setTasks] = useState(mockTasks)

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          return {
            ...task,
            completed: !task.completed,
            section: !task.completed ? 'completed' : 'today',
          }
        }
        return task
      })
    )
  }

  const groupedTasks = sections.map((section) => ({
    ...section,
    tasks: tasks.filter((t) => t.section === section.key),
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border safe-top">
        <h1 className="text-lg font-semibold">Tasks</h1>
        <button className="flex items-center gap-1 text-primary text-sm font-medium">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </header>

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {groupedTasks.map((section) => {
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
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center gap-3 py-2 cursor-pointer group"
                  >
                    <button className="flex-shrink-0 text-muted-foreground group-hover:text-foreground">
                      {task.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        task.completed ? 'text-muted-foreground line-through' : ''
                      }`}
                    >
                      {task.title}
                    </span>
                    {(task.dueTime || task.dueDate) && (
                      <span className="text-xs text-muted-foreground">
                        {task.dueTime || task.dueDate}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
