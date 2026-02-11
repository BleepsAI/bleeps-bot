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

// PATCH /api/groups - Update group name
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupId, userId, name } = body

    if (!groupId || !userId || !name) {
      return NextResponse.json({ error: 'groupId, userId, and name required' }, { status: 400 })
    }

    // Verify user is owner of the group
    const { data: membership, error: memberError } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', groupId)
      .eq('user_id', userId)
      .single()

    if (memberError || !membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Update group name
    const { error: updateError } = await supabase
      .from('chats')
      .update({ name })
      .eq('id', groupId)

    if (updateError) {
      console.error('Error updating group:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Groups PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

// DELETE /api/groups - Delete group
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupId, userId } = body

    if (!groupId || !userId) {
      return NextResponse.json({ error: 'groupId and userId required' }, { status: 400 })
    }

    // Verify user is owner of the group
    const { data: membership, error: memberError } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chat_id', groupId)
      .eq('user_id', userId)
      .single()

    if (memberError || !membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Delete chat members first (foreign key constraint)
    await supabase
      .from('chat_members')
      .delete()
      .eq('chat_id', groupId)

    // Delete the group
    const { error: deleteError } = await supabase
      .from('chats')
      .delete()
      .eq('id', groupId)

    if (deleteError) {
      console.error('Error deleting group:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Groups DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
  }
}
