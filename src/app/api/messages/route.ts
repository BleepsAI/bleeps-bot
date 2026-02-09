import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/messages?chatId=xxx&limit=50
export async function GET(request: NextRequest) {
  try {
    const chatId = request.nextUrl.searchParams.get('chatId')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

    if (!chatId) {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Messages fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({
      messages: data.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at
      }))
    })
  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
