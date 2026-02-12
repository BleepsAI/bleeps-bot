import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/messages?chatId=xxx&limit=50&userId=xxx
export async function GET(request: NextRequest) {
  try {
    const chatId = request.nextUrl.searchParams.get('chatId')
    const requestingUserId = request.nextUrl.searchParams.get('userId')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

    if (!chatId) {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 })
    }

    // Fetch messages with user_id (get newest first, then reverse for display)
    const { data: rawData, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at, user_id')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Reverse to get chronological order for display
    const data = rawData ? [...rawData].reverse() : []

    if (error) {
      console.error('Messages fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Get unique user IDs to fetch display names
    const userIds = [...new Set(data.filter(m => m.user_id).map(m => m.user_id))]

    let userNames: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds)

      if (profiles) {
        userNames = Object.fromEntries(
          profiles.map(p => [p.user_id, p.display_name || 'User'])
        )
      }
    }

    return NextResponse.json({
      messages: data.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        senderId: m.user_id,
        senderName: m.user_id ? (userNames[m.user_id] || 'User') : null,
        isOwnMessage: m.user_id === requestingUserId
      }))
    })
  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// DELETE /api/messages - Delete a message
export async function DELETE(request: NextRequest) {
  try {
    const { messageId, userId } = await request.json()

    if (!messageId || !userId) {
      return NextResponse.json({ error: 'messageId and userId required' }, { status: 400 })
    }

    // Verify the user owns this message
    const { data: message } = await supabase
      .from('messages')
      .select('user_id')
      .eq('id', messageId)
      .single()

    if (!message || message.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
