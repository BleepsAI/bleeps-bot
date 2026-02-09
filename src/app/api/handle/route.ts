import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Reserved handles (system routes)
const RESERVED_HANDLES = new Set([
  'admin', 'api', 'app', 'auth', 'bleeps', 'chat', 'help', 'home',
  'inbox', 'invite', 'join', 'login', 'logout', 'me', 'notifications',
  'profile', 'settings', 'support', 'tasks', 'user', 'users'
])

// Validate handle format
function isValidFormat(handle: string): boolean {
  // 3-15 chars, starts with letter/number, alphanumeric + underscore only
  return /^[a-z0-9][a-z0-9_]{2,14}$/.test(handle.toLowerCase())
}

// GET /api/handle?handle=xxx - Check if handle is available
// GET /api/handle?userId=xxx - Get user's current handle
export async function GET(request: NextRequest) {
  try {
    const handle = request.nextUrl.searchParams.get('handle')?.toLowerCase()
    const userId = request.nextUrl.searchParams.get('userId')

    // If userId provided, return their current handle
    if (userId) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('handle, display_name')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Handle fetch error:', error)
      }

      return NextResponse.json({
        handle: data?.handle || null,
        displayName: data?.display_name || null
      })
    }

    if (!handle) {
      return NextResponse.json({ error: 'handle or userId required' }, { status: 400 })
    }

    // Check format
    if (!isValidFormat(handle)) {
      return NextResponse.json({
        available: false,
        reason: 'Handle must be 3-15 characters, start with a letter or number, and contain only letters, numbers, and underscores'
      })
    }

    // Check if reserved
    if (RESERVED_HANDLES.has(handle)) {
      return NextResponse.json({
        available: false,
        reason: 'This handle is reserved'
      })
    }

    // Check if taken
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('handle', handle)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Handle check error:', error)
      return NextResponse.json({ error: 'Failed to check handle' }, { status: 500 })
    }

    return NextResponse.json({
      available: !data,
      reason: data ? 'This handle is already taken' : null
    })
  } catch (error) {
    console.error('Handle API error:', error)
    return NextResponse.json({ error: 'Failed to check handle' }, { status: 500 })
  }
}

// POST /api/handle - Claim a handle
export async function POST(request: NextRequest) {
  try {
    const { userId, handle } = await request.json()

    if (!userId || !handle) {
      return NextResponse.json({ error: 'userId and handle required' }, { status: 400 })
    }

    const cleanHandle = handle.toLowerCase()

    // Check format
    if (!isValidFormat(cleanHandle)) {
      return NextResponse.json({
        success: false,
        error: 'Handle must be 3-15 characters, start with a letter or number, and contain only letters, numbers, and underscores'
      })
    }

    // Check if reserved
    if (RESERVED_HANDLES.has(cleanHandle)) {
      return NextResponse.json({
        success: false,
        error: 'This handle is reserved'
      })
    }

    // Check if taken by another user
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('handle', cleanHandle)
      .single()

    if (existing && existing.user_id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'This handle is already taken'
      })
    }

    // Upsert the profile with handle
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        handle: cleanHandle,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Handle claim error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to claim handle'
      })
    }

    return NextResponse.json({ success: true, handle: cleanHandle })
  } catch (error) {
    console.error('Handle claim error:', error)
    return NextResponse.json({ error: 'Failed to claim handle' }, { status: 500 })
  }
}

// GET /api/handle/[handle] - Get user by handle (for lookups)
