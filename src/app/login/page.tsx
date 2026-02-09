'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await signIn(email)

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the login link!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Bleeps</h1>
          <p className="mt-2 text-muted-foreground">Your AI assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>

          {message && (
            <p className="text-center text-sm text-muted-foreground">{message}</p>
          )}
        </form>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            14-day free trial, then $5/mo
          </p>
        </div>
      </div>
    </div>
  )
}
