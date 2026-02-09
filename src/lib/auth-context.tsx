'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, type User } from './supabase'
import type { User as AuthUser, Session } from '@supabase/supabase-js'

interface AuthContextType {
  authUser: AuthUser | null
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Safety timeout - if auth takes more than 10s, stop loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth timeout - forcing loading to false')
        setLoading(false)
      }
    }, 10000)

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeout)
        if (error) {
          console.error('Session error:', error)
          setSession(null)
          setAuthUser(null)
          setUser(null)
          setLoading(false)
          return
        }
        setSession(session)
        setAuthUser(session?.user ?? null)
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        clearTimeout(timeout)
        console.error('Auth error:', err.message)
        setSession(null)
        setAuthUser(null)
        setUser(null)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setAuthUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        // User might not exist in users table yet - that's ok
        setUser(null)
      } else {
        setUser(data as User)
      }
    } catch (err) {
      console.error('fetchUserProfile error:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

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
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
    setUser(null)
    setAuthUser(null)
    setSession(null)
    // Redirect to login
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ authUser, user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
