import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Handle @username profile URLs - rewrite to /u/username
  if (pathname.startsWith('/@')) {
    const handle = pathname.slice(2) // Remove '/@'
    const url = request.nextUrl.clone()
    url.pathname = `/u/${handle}`
    return NextResponse.rewrite(url)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
