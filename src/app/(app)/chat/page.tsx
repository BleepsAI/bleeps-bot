'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// Generate or retrieve anonymous user ID
function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'

  let id = localStorage.getItem('bleeps_user_id')
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 15)
    localStorage.setItem('bleeps_user_id', id)
  }
  return id
}

export default function ChatPage() {
  const [userId, setUserId] = useState<string>('anonymous')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! I'm Bleeps, your personal AI assistant. I can help you with reminders, tasks, research, and more. What would you like to do?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Get user ID on mount
  useEffect(() => {
    setUserId(getAnonymousUserId())
  }, [])

  // Detect timezone from IP on mount (non-blocking)
  useEffect(() => {
    setDetectedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)

    fetch('https://worldtimeapi.org/api/ip', { signal: AbortSignal.timeout(3000) })
      .then(res => res.json())
      .then(data => {
        if (data.timezone) {
          setDetectedTimezone(data.timezone)
        }
      })
      .catch(() => {})
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          detectedTimezone,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border safe-top">
        <h1 className="text-lg font-semibold">Bleeps</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 safe-bottom">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Bleeps..."
              rows={1}
              className="w-full resize-none rounded-2xl border border-border bg-muted px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ maxHeight: '120px' }}
            />
            <button
              type="button"
              className="absolute right-3 bottom-3 text-muted-foreground hover:text-foreground"
              aria-label="Voice input"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center h-11 w-11 rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
