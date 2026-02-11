'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import type { User as AuthUser, Session } from '@supabase/supabase-js'

interface AuthContextType {
  authUser: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setAuthUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  async function signIn(email: string) {
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      : `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAuthUser(null)
    setSession(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ authUser, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    return {
      authUser: null,
      session: null,
      loading: true,
      signIn: async () => ({ error: new Error('Not in provider') }),
      signOut: async () => {}
    }
  }
  return context
}
