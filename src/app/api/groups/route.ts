import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ChatData {
  id: string
  type: 'solo' | 'group'
  name: string
  invite_code: string | null
  created_at: string
}

interface MembershipWithChat {
  role: string
  chat_id: string
  chats: ChatData | null
}

// GET /api/groups - List user's chats (solo + groups)
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Get all chats user is a member of
    const { data, error } = await supabase
      .from('chat_members')
      .select(`
        role,
        chat_id,
        chats (
          id,
          type,
          name,
          invite_code,
          created_at
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching chats:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Cast to our expected type (Supabase returns joined data as object, not array)
    const memberships = (data || []) as unknown as MembershipWithChat[]

    // Separate solo and group chats
    const soloChat = memberships.find(m => m.chats?.type === 'solo')
    const groups = memberships
      .filter(m => m.chats?.type === 'group')
      .map(m => ({
        id: m.chats!.id,
        name: m.chats!.name,
        role: m.role,
        invite_code: m.role === 'owner' ? m.chats!.invite_code : undefined,
        created_at: m.chats!.created_at
      }))

    return NextResponse.json({
      soloChat: soloChat ? {
        id: soloChat.chats!.id,
        type: 'solo',
        name: 'Personal'
      } : null,
      groups
    })
  } catch (error) {
    console.error('Groups API error:', error)
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}
