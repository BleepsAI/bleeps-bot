import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { TIER_LIMITS, type SubscriptionTier } from '@/lib/supabase'

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'https://bleeps-2-production.up.railway.app'
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, detectedTimezone, isGreeting } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    // Check user limits if userId provided (but don't block if lookup fails)
    let user = null
    if (userId) {
      const { data, error: userError } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status, messages_this_month, trial_ends_at')
        .eq('id', userId)
        .single()

      if (userError) {
        console.warn('User lookup failed:', userError.message)
        // Continue without user tracking
      } else if (data) {
        user = data

        // Check if trial expired and not subscribed
        const trialExpired = user.trial_ends_at && new Date(user.trial_ends_at) < new Date()
        if (trialExpired && user.subscription_status === 'trialing') {
          return NextResponse.json({
            error: 'Trial expired. Please subscribe to continue.',
            code: 'TRIAL_EXPIRED'
          }, { status: 403 })
        }

        // Check message limits
        const limit = TIER_LIMITS[user.subscription_tier as SubscriptionTier].messages
        if (user.messages_this_month >= limit) {
          return NextResponse.json({
            error: 'Message limit reached. Upgrade for more.',
            code: 'LIMIT_REACHED'
          }, { status: 403 })
        }

        // Increment message count
        await supabase
          .from('users')
          .update({ messages_this_month: user.messages_this_month + 1 })
          .eq('id', userId)
      }
    }

    // Call OpenClaw gateway
    const lastMessage = messages[messages.length - 1]
    const gatewayResponse = await fetch(`${OPENCLAW_GATEWAY_URL}/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        message: lastMessage.content,
        userId: userId || null,
        channel: 'web',
        detectedTimezone: detectedTimezone || null,
        isGreeting: isGreeting || false,
      }),
    })

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text()
      console.error('Gateway error:', errorText)
      throw new Error(`Gateway error: ${gatewayResponse.status}`)
    }

    const data = await gatewayResponse.json()
    const content = data.response || data.message || data.content || ''

    // Save messages to database if userId provided
    if (userId) {
      const lastUserMessage = messages[messages.length - 1]
      await supabase.from('messages').insert([
        { user_id: userId, role: 'user', content: lastUserMessage.content, channel: 'web' },
        { user_id: userId, role: 'assistant', content, channel: 'web' },
      ])
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
