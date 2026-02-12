import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/inbox - Get user's notification log
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Fetch notification log for the user
    const { data: notifications, error } = await supabase
      .from('notification_log')
      .select('id, task_id, type, title, body, channel, sent_at, read_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format items
    const items = (notifications || []).map(n => ({
      id: n.id,
      taskId: n.task_id,
      type: n.type,
      title: n.title,
      body: n.body,
      channel: n.channel,
      sentAt: n.sent_at,
      readAt: n.read_at,
      isRead: !!n.read_at
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Inbox API error:', error)
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 })
  }
}

// DELETE /api/inbox - Delete a notification from the log
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('notification_log')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting notification:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Inbox DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
}

// PATCH /api/inbox - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const { id, markAsRead } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (markAsRead) {
      updates.read_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('notification_log')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating notification:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Inbox PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
