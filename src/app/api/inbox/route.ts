import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/inbox - Get user's reminders and tasks
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Fetch reminders by user_id (pending only)
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('id, title, due_at, completed, created_at')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('due_at', { ascending: true })
      .limit(50)

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError)
    }

    // Fetch tasks by user_id (incomplete only)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, description, completed, due_date, created_at')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
    }

    // Format items
    const items = [
      ...(reminders || []).map(r => ({
        id: r.id,
        type: 'reminder' as const,
        title: r.title,
        time: r.due_at,
        status: r.completed ? 'done' : 'pending',
        chatName: 'Personal',
        createdAt: r.created_at
      })),
      ...(tasks || []).map(t => ({
        id: t.id,
        type: 'task' as const,
        title: t.title,
        description: t.description,
        time: t.due_date || t.created_at,
        status: t.completed ? 'done' : 'pending',
        chatName: 'Personal',
        createdAt: t.created_at
      }))
    ]

    // Sort by time (upcoming first)
    items.sort((a, b) => {
      const timeA = new Date(a.time).getTime()
      const timeB = new Date(b.time).getTime()
      return timeA - timeB
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Inbox API error:', error)
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 })
  }
}
