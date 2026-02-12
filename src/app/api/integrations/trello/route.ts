import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TRELLO_API_KEY = process.env.TRELLO_API_KEY

// POST /api/integrations/trello - Save Trello connection
export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await request.json()

    if (!userId || !token) {
      return NextResponse.json({ error: 'userId and token required' }, { status: 400 })
    }

    if (!TRELLO_API_KEY) {
      return NextResponse.json({ error: 'Trello not configured' }, { status: 500 })
    }

    // Verify token works by fetching user info
    const meResponse = await fetch(
      `https://api.trello.com/1/members/me?key=${TRELLO_API_KEY}&token=${token}&fields=fullName,username`
    )

    if (!meResponse.ok) {
      return NextResponse.json({ error: 'Invalid Trello token' }, { status: 400 })
    }

    const me = await meResponse.json()

    // Save to integrations table
    const { error } = await supabase
      .from('integrations')
      .upsert({
        user_id: userId,
        provider: 'trello',
        credentials: { token }, // Only store token, API key is app-level
        metadata: {
          username: me.username,
          fullName: me.fullName
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' })

    if (error) {
      console.error('Error saving Trello connection:', error)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      username: me.username,
      fullName: me.fullName
    })
  } catch (error) {
    console.error('Trello connect error:', error)
    return NextResponse.json({ error: 'Failed to connect Trello' }, { status: 500 })
  }
}

// GET /api/integrations/trello/auth - Get auth URL
export async function GET() {
  if (!TRELLO_API_KEY) {
    return NextResponse.json({ error: 'Trello not configured' }, { status: 500 })
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bleeps.ai'}/auth/trello`

  const authUrl = `https://trello.com/1/authorize?` + new URLSearchParams({
    key: TRELLO_API_KEY,
    name: 'Bleeps',
    scope: 'read,write',
    response_type: 'token',
    callback_method: 'fragment',
    return_url: callbackUrl,
    expiration: 'never'
  }).toString()

  return NextResponse.json({ authUrl })
}
