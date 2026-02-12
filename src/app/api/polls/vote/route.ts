import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST /api/polls/vote - Vote on a poll option (toggle)
export async function POST(request: NextRequest) {
  try {
    const { pollId, optionId, userId } = await request.json()

    if (!pollId || !optionId || !userId) {
      return NextResponse.json({ error: 'pollId, optionId, and userId required' }, { status: 400 })
    }

    // Check if poll is closed and get multiple_choice setting
    const { data: poll } = await supabase
      .from('polls')
      .select('closed_at, multiple_choice')
      .eq('id', pollId)
      .single()

    if (poll?.closed_at) {
      return NextResponse.json({ error: 'Poll is closed' }, { status: 400 })
    }

    // Check if user already voted for this option
    const { data: existingVote } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('option_id', optionId)
      .eq('user_id', userId)
      .single()

    if (existingVote) {
      // Remove vote (toggle off)
      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('id', existingVote.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: 'removed' })
    } else {
      // For single-choice polls, remove any existing votes first
      if (!poll?.multiple_choice) {
        await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', pollId)
          .eq('user_id', userId)
      }

      // Add vote
      const { error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: userId
        })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: 'added' })
    }
  } catch (error) {
    console.error('Poll vote error:', error)
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }
}
