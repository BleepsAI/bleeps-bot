import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/tasks - Get user's tasks across all chats
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Get all chat IDs the user is a member of
    const { data: memberships } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId)

    const chatIds = (memberships || []).map(m => m.chat_id)

    if (chatIds.length === 0) {
      return NextResponse.json({ tasks: [] })
    }

    // Fetch all tasks
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, description, status, priority, due_date, chat_id, created_at')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get chat names
    const { data: chats } = await supabase
      .from('chats')
      .select('id, name, type')
      .in('id', chatIds)

    const chatMap: Record<string, string> = {}
    for (const chat of chats || []) {
      chatMap[chat.id] = chat.type === 'solo' ? 'Personal' : chat.name
    }

    // Format tasks
    const formattedTasks = (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      chatId: t.chat_id,
      chatName: chatMap[t.chat_id] || 'Unknown',
      createdAt: t.created_at
    }))

    return NextResponse.json({ tasks: formattedTasks })
  } catch (error) {
    console.error('Tasks API error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// PATCH /api/tasks - Update a task
export async function PATCH(request: NextRequest) {
  try {
    const { taskId, status } = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tasks PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
