import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/briefing - Get user's briefing preferences
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('daily_briefing_enabled, daily_briefing_time')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    enabled: data?.daily_briefing_enabled || false,
    time: data?.daily_briefing_time || '08:00:00'
  })
}

// POST /api/briefing - Update user's briefing preferences
export async function POST(request: NextRequest) {
  try {
    const { userId, enabled, time } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (typeof enabled === 'boolean') {
      updates.daily_briefing_enabled = enabled
    }

    if (time) {
      // Validate time format (HH:MM or HH:MM:SS)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
      if (!timeRegex.test(time)) {
        return NextResponse.json({ error: 'Invalid time format' }, { status: 400 })
      }
      updates.daily_briefing_time = time.length === 5 ? `${time}:00` : time
    }

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        ...updates
      }, { onConflict: 'user_id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Briefing API error:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
