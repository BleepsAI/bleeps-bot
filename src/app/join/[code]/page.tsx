'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Users, Loader2, CheckCircle, XCircle } from 'lucide-react'

// Get or create anonymous user ID
function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'

  let id = localStorage.getItem('bleeps_user_id')
  if (!id || id.startsWith('anon_')) {
    id = crypto.randomUUID()
    localStorage.setItem('bleeps_user_id', id)
  }
  return id
}

export default function JoinGroupPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [groupName, setGroupName] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const joinGroup = async () => {
      const userId = getAnonymousUserId()

      try {
        // Call the chat API to join the group via Claude
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            messages: [{ role: 'user', content: `join group with code ${code}` }],
            detectedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to join group')
        }

        const data = await response.json()
        const content = data.content || ''

        // Check if join was successful by looking at the response
        if (content.toLowerCase().includes('joined') || content.toLowerCase().includes("you've joined")) {
          // Extract group name from response if possible
          const nameMatch = content.match(/joined ["']?([^"'!]+)["']?[!.]?/i)
          setGroupName(nameMatch ? nameMatch[1].trim() : 'the group')
          setStatus('success')

          // Store the chatId if returned
          if (data.chatId) {
            localStorage.setItem('bleeps_current_chat_id', data.chatId)
          }

          // Redirect to chat after a short delay
          setTimeout(() => {
            router.push('/chat')
          }, 2000)
        } else if (content.toLowerCase().includes('already a member')) {
          setGroupName('')
          setErrorMessage("You're already a member of this group!")
          setStatus('error')
          setTimeout(() => {
            router.push('/chat')
          }, 2000)
        } else if (content.toLowerCase().includes('invalid')) {
          setErrorMessage('Invalid invite code. Please check and try again.')
          setStatus('error')
        } else {
          // Assume success if no obvious error
          setGroupName('the group')
          setStatus('success')
          setTimeout(() => {
            router.push('/chat')
          }, 2000)
        }
      } catch (error) {
        console.error('Join error:', error)
        setErrorMessage('Something went wrong. Please try again.')
        setStatus('error')
      }
    }

    if (code) {
      joinGroup()
    }
  }, [code, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Joining group...</h1>
            <p className="text-muted-foreground">Code: {code}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h1 className="text-xl font-semibold">Welcome to {groupName}!</h1>
            <p className="text-muted-foreground">Redirecting to chat...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <h1 className="text-xl font-semibold">Couldn't join group</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <button
              onClick={() => router.push('/chat')}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Go to Chat
            </button>
          </>
        )}
      </div>
    </div>
  )
}
