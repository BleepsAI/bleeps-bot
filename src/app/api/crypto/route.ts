import { NextResponse } from 'next/server'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'https://bleeps-2-production.up.railway.app'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

// GET /api/crypto - Get server's public key for E2E encryption
export async function GET() {
  try {
    // Fetch public key from backend
    const response = await fetch(`${GATEWAY_URL}/api/crypto/public-key`, {
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Crypto not available' },
        { status: 503 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      publicKey: data.publicKey,
      enabled: data.enabled,
    })
  } catch (error) {
    console.error('Error fetching crypto public key:', error)
    return NextResponse.json(
      { error: 'Failed to fetch public key' },
      { status: 500 }
    )
  }
}
