import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/polls?chatId=xxx - Get polls for a chat
export async function GET(request: NextRequest) {
  try {
    const chatId = request.nextUrl.searchParams.get('chatId')
    const pollId = request.nextUrl.searchParams.get('pollId')

    if (pollId) {
      // Get single poll with options and votes
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single()

      if (pollError) {
        return NextResponse.json({ error: pollError.message }, { status: 500 })
      }

      const { data: options } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', pollId)
        .order('sort_order', { ascending: true })

      const { data: votes } = await supabase
        .from('poll_votes')
        .select('option_id, user_id')
        .eq('poll_id', pollId)

      // Get voter names
      const voterIds = [...new Set((votes || []).map(v => v.user_id))]
      let profileMap = new Map<string, string>()

      if (voterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', voterIds)

        profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]))
      }

      // Format options with vote counts and voter names
      const formattedOptions = (options || []).map(opt => {
        const optionVotes = (votes || []).filter(v => v.option_id === opt.id)
        return {
          id: opt.id,
          text: opt.text,
          voteCount: optionVotes.length,
          voters: optionVotes.map(v => ({
            userId: v.user_id,
            name: profileMap.get(v.user_id) || 'Anonymous'
          }))
        }
      })

      return NextResponse.json({
        poll: {
          id: poll.id,
          question: poll.question,
          creatorId: poll.creator_id,
          createdAt: poll.created_at,
          closedAt: poll.closed_at,
          options: formattedOptions,
          totalVotes: (votes || []).length
        }
      })
    }

    if (!chatId) {
      return NextResponse.json({ error: 'chatId or pollId required' }, { status: 400 })
    }

    // Get all polls for chat
    const { data: polls, error } = await supabase
      .from('polls')
      .select('id, question, creator_id, created_at, closed_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ polls: polls || [] })
  } catch (error) {
    console.error('Polls API error:', error)
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 })
  }
}

// POST /api/polls - Create a poll from UI
export async function POST(request: NextRequest) {
  try {
    const { chatId, creatorId, question, options } = await request.json()

    if (!chatId || !creatorId || !question || !options) {
      return NextResponse.json({ error: 'chatId, creatorId, question, and options required' }, { status: 400 })
    }

    if (options.length < 2 || options.length > 10) {
      return NextResponse.json({ error: 'Poll must have 2-10 options' }, { status: 400 })
    }

    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        chat_id: chatId,
        creator_id: creatorId,
        question,
        multiple_choice: false
      })
      .select()
      .single()

    if (pollError) {
      return NextResponse.json({ error: pollError.message }, { status: 500 })
    }

    // Create options
    const optionRows = options.map((text: string, index: number) => ({
      poll_id: poll.id,
      text,
      sort_order: index
    }))

    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionRows)

    if (optionsError) {
      return NextResponse.json({ error: optionsError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, pollId: poll.id })
  } catch (error) {
    console.error('Polls POST error:', error)
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }
}

// DELETE /api/polls - Delete a poll
export async function DELETE(request: NextRequest) {
  try {
    const { pollId, userId } = await request.json()

    if (!pollId || !userId) {
      return NextResponse.json({ error: 'pollId and userId required' }, { status: 400 })
    }

    // Verify the user is the creator
    const { data: poll } = await supabase
      .from('polls')
      .select('creator_id')
      .eq('id', pollId)
      .single()

    if (!poll || poll.creator_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete votes first (foreign key constraint)
    await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId)

    // Delete options
    await supabase
      .from('poll_options')
      .delete()
      .eq('poll_id', pollId)

    // Delete poll
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete poll error:', error)
    return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 })
  }
}
