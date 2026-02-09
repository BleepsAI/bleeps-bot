import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/handle/[handle] - Get user by handle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params
    const cleanHandle = handle.toLowerCase()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, handle, display_name')
      .eq('handle', cleanHandle)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      userId: data.user_id,
      handle: data.handle,
      displayName: data.display_name
    })
  } catch (error) {
    console.error('Handle lookup error:', error)
    return NextResponse.json({ error: 'Failed to lookup handle' }, { status: 500 })
  }
}
