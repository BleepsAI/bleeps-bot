'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function Home() {
  const { authUser, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // If there's a code param, redirect to auth callback (Supabase magic link)
    const code = searchParams.get('code')
    if (code) {
      router.replace(`/auth/callback?code=${code}`)
      return
    }

    if (!loading && authUser) {
      router.push('/chat')
    }
  }, [authUser, loading, router, searchParams])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (authUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Bleeps
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your AI assistant for productivity and financial signals
        </p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Start 14-day free trial
        </Link>
      </div>

      {/* Pricing */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Simple pricing
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Lite */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900">Lite</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">$5<span className="text-base font-normal text-gray-500">/mo</span></p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>150 messages/month</li>
              <li>10 reminders</li>
              <li>2 price alerts</li>
              <li>Telegram</li>
            </ul>
          </div>

          {/* Standard */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-blue-600 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Standard</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">$10<span className="text-base font-normal text-gray-500">/mo</span></p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>500 messages/month</li>
              <li>25 reminders</li>
              <li>10 price alerts</li>
              <li>Telegram + WhatsApp</li>
              <li>Daily briefing</li>
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">$20<span className="text-base font-normal text-gray-500">/mo</span></p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>Unlimited messages</li>
              <li>Unlimited reminders</li>
              <li>Unlimited price alerts</li>
              <li>All channels + SMS</li>
              <li>Financial signals</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
