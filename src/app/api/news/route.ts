import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/news - Get user's news brief preferences
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('news_enabled, news_sources, news_brief_times')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    enabled: data?.news_enabled || false,
    sources: data?.news_sources || [],
    times: data?.news_brief_times || ['08:00']
  })
}

// POST /api/news - Update user's news brief preferences
export async function POST(request: NextRequest) {
  try {
    const { userId, enabled, sources, times } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (typeof enabled === 'boolean') {
      updates.news_enabled = enabled
    }

    if (sources !== undefined) {
      updates.news_sources = sources
    }

    if (times !== undefined) {
      // Validate times format (array of HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!Array.isArray(times) || !times.every(t => timeRegex.test(t))) {
        return NextResponse.json({ error: 'Invalid times format' }, { status: 400 })
      }
      updates.news_brief_times = times
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
    console.error('News API error:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
