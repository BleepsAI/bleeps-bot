'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

function TrelloCallbackContent() {
  const router = useRouter()
  const { authUser } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      // Trello returns token in URL fragment (after #)
      // We need to get it from window.location.hash
      const hash = window.location.hash
      const token = hash.replace('#token=', '')

      if (!token) {
        setStatus('error')
        setError('No token received from Trello')
        return
      }

      if (!authUser?.id) {
        setStatus('error')
        setError('Not logged in')
        return
      }

      try {
        const response = await fetch('/api/integrations/trello', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authUser.id,
            token
          })
        })

        const data = await response.json()

        if (data.success) {
          setStatus('success')
          // Redirect to settings after a moment
          setTimeout(() => {
            router.push('/settings')
          }, 2000)
        } else {
          setStatus('error')
          setError(data.error || 'Failed to connect Trello')
        }
      } catch (err) {
        setStatus('error')
        setError('Failed to save connection')
      }
    }

    if (authUser) {
      handleCallback()
    }
  }, [authUser, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {status === 'loading' && (
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Connecting Trello...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Trello Connected!</p>
          <p className="text-muted-foreground mt-2">Redirecting to settings...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Connection Failed</p>
          <p className="text-muted-foreground mt-2">{error}</p>
          <button
            onClick={() => router.push('/settings')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Back to Settings
          </button>
        </div>
      )}
    </div>
  )
}

export default function TrelloCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading...</p>
      </div>
    }>
      <TrelloCallbackContent />
    </Suspense>
  )
}
