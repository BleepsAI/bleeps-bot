import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/integrations - Check integration status
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const provider = request.nextUrl.searchParams.get('provider')

    if (!userId || !provider) {
      return NextResponse.json({ error: 'userId and provider required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('integrations')
      .select('id, provider, metadata, created_at')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single()

    if (error || !data) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      username: data.metadata?.username || data.metadata?.fullName || null,
      connectedAt: data.created_at
    })
  } catch (error) {
    console.error('Integrations GET error:', error)
    return NextResponse.json({ error: 'Failed to check integration' }, { status: 500 })
  }
}

// DELETE /api/integrations - Disconnect integration
export async function DELETE(request: NextRequest) {
  try {
    const { userId, provider } = await request.json()

    if (!userId || !provider) {
      return NextResponse.json({ error: 'userId and provider required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider)

    if (error) {
      console.error('Error disconnecting integration:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Integrations DELETE error:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
