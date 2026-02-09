import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/chat'

  // Log for debugging
  console.log('Auth callback:', { code: !!code, token_hash: !!token_hash, type, error, error_description })

  // If Supabase returned an error
  if (error) {
    console.error('Supabase auth error:', error, error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`)
  }

  if (code || (token_hash && type)) {
    const supabase = await createClient()

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('Code exchange error:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
      }
    } else if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'email' | 'magiclink',
      })
      if (error) {
        console.error('OTP verify error:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
      }
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // No code or token_hash, redirect to login
  return NextResponse.redirect(`${origin}/login?error=missing_code`)
}
