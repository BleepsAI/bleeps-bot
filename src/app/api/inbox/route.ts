import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/inbox - Get user's reminders and tasks across all chats
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
      return NextResponse.json({ items: [] })
    }

    // Fetch reminders (pending and recent completed)
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('id, message, remind_at, status, chat_id, created_at')
      .in('chat_id', chatIds)
      .in('status', ['pending', 'sent'])
      .order('remind_at', { ascending: true })
      .limit(50)

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError)
    }

    // Fetch tasks (incomplete)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, description, status, priority, due_date, chat_id, created_at')
      .in('chat_id', chatIds)
      .neq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(50)

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
    }

    // Get chat names for context
    const { data: chats } = await supabase
      .from('chats')
      .select('id, name, type')
      .in('id', chatIds)

    const chatMap: Record<string, string> = {}
    for (const chat of chats || []) {
      chatMap[chat.id] = chat.type === 'solo' ? 'Personal' : chat.name
    }

    // Format items
    const items = [
      ...(reminders || []).map(r => ({
        id: r.id,
        type: 'reminder' as const,
        title: r.message,
        time: r.remind_at,
        status: r.status,
        chatId: r.chat_id,
        chatName: chatMap[r.chat_id] || 'Unknown',
        createdAt: r.created_at
      })),
      ...(tasks || []).map(t => ({
        id: t.id,
        type: 'task' as const,
        title: t.title,
        description: t.description,
        time: t.due_date || t.created_at,
        status: t.status,
        priority: t.priority,
        chatId: t.chat_id,
        chatName: chatMap[t.chat_id] || 'Unknown',
        createdAt: t.created_at
      }))
    ]

    // Sort by time (upcoming first for reminders, recent first for tasks)
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
