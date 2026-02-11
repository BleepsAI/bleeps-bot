'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { UserPlus, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface UserProfile {
  handle: string
  displayName: string | null
  userId: string
}

export default function ProfilePage() {
  const params = useParams()
  const handle = params.handle as string
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(`/api/handle/${handle}`)
        if (response.ok) {
          const data = await response.json()
          setProfile(data)
        } else {
          setNotFound(true)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (handle) {
      fetchProfile()
    }
  }, [handle])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <p className="text-muted-foreground mb-6">
            @{handle} doesn&apos;t exist on Bleeps yet.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Join Bleeps
          </Link>
        </div>
      </div>
    )
  }

  const displayName = profile?.displayName || `@${profile?.handle}`

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-lg mx-auto px-6 py-4">
          <span className="text-xl font-semibold">Bleeps</span>
        </div>
      </header>

      {/* Profile Card */}
      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-10">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-primary">
              {(profile?.displayName || profile?.handle || '?')[0].toUpperCase()}
            </span>
          </div>

          {/* Name & Handle */}
          <h1 className="text-2xl font-bold mb-1">{displayName}</h1>
          {profile?.displayName && (
            <p className="text-muted-foreground">@{profile.handle}</p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Add to Group - for existing users */}
          <Link
            href={`/chat?invite=${profile?.handle}`}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-primary text-primary-foreground rounded-2xl font-medium hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-5 w-5" />
            Add @{profile?.handle} to a group
          </Link>

          {/* Join Bleeps - for new users */}
          <Link
            href={`/login?ref=${profile?.handle}`}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-muted text-foreground rounded-2xl font-medium hover:bg-muted/80 transition-colors"
          >
            <Download className="h-5 w-5" />
            Join Bleeps
          </Link>
        </div>

        {/* Tagline */}
        <p className="text-center text-sm text-muted-foreground mt-10">
          Bleeps is your AI assistant for reminders, tasks, and daily briefs.
        </p>
      </main>
    </div>
  )
}
