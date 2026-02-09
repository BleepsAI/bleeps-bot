'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, ChevronDown, Users, User, Share2, Copy, Check } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatInfo {
  id: string
  type: 'solo' | 'group'
  name: string
  role?: string
  invite_code?: string
}

// Generate or retrieve anonymous user ID (proper UUID format)
function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'

  let id = localStorage.getItem('bleeps_user_id')

  // Migrate old-style IDs (anon_xyz) to proper UUIDs
  if (!id || id.startsWith('anon_')) {
    id = crypto.randomUUID()
    localStorage.setItem('bleeps_user_id', id)
  }

  return id
}

export default function ChatPage() {
  const [userId, setUserId] = useState<string>('anonymous')
  const [chatId, setChatId] = useState<string | null>(null)
  const [currentChat, setCurrentChat] = useState<ChatInfo | null>(null)
  const [chats, setChats] = useState<{ solo: ChatInfo | null; groups: ChatInfo[] }>({ solo: null, groups: [] })
  const [showChatPicker, setShowChatPicker] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null)
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Get user ID and fetch chats on mount
  useEffect(() => {
    const id = getAnonymousUserId()
    setUserId(id)

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setDetectedTimezone(tz)

    // Fetch user's chats
    const fetchChats = async () => {
      try {
        const response = await fetch(`/api/groups?userId=${id}`)
        if (response.ok) {
          const data = await response.json()
          setChats({
            solo: data.soloChat,
            groups: data.groups || []
          })

          // Check for stored chat preference
          const storedChatId = localStorage.getItem('bleeps_current_chat_id')
          if (storedChatId) {
            // Find the chat
            if (data.soloChat?.id === storedChatId) {
              setCurrentChat(data.soloChat)
              setChatId(storedChatId)
            } else {
              const group = data.groups?.find((g: ChatInfo) => g.id === storedChatId)
              if (group) {
                setCurrentChat({ ...group, type: 'group' })
                setChatId(storedChatId)
              } else {
                // Default to solo
                setCurrentChat(data.soloChat)
                setChatId(data.soloChat?.id || null)
              }
            }
          } else {
            // Default to solo chat
            setCurrentChat(data.soloChat)
            setChatId(data.soloChat?.id || null)
          }
        }
      } catch (error) {
        console.error('Error fetching chats:', error)
      }
    }

    fetchChats()
  }, [])

  // Fetch messages or greeting when chatId changes
  useEffect(() => {
    if (!userId || userId === 'anonymous' || !chatId) return

    const fetchMessages = async () => {
      setIsLoading(true)

      try {
        // First, try to fetch existing messages
        const messagesResponse = await fetch(`/api/messages?chatId=${chatId}&limit=50`)

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()

          if (messagesData.messages && messagesData.messages.length > 0) {
            // We have existing messages, show them
            setMessages(messagesData.messages.map((m: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
            })))
            setIsLoading(false)
            return
          }
        }

        // No existing messages, fetch a greeting
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            chatId,
            messages: [{ role: 'user', content: '__greeting__' }],
            detectedTimezone,
            isGreeting: true,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          // Update chatId if returned from backend
          if (data.chatId && data.chatId !== chatId) {
            setChatId(data.chatId)
            localStorage.setItem('bleeps_current_chat_id', data.chatId)
          }
          setMessages([{
            id: '1',
            role: 'assistant',
            content: data.content,
            timestamp: new Date(),
          }])
        } else {
          setMessages([{
            id: '1',
            role: 'assistant',
            content: "Hey! I'm Bleeps 👋 What can I help you with today?",
            timestamp: new Date(),
          }])
        }
      } catch {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: "Hey! I'm Bleeps 👋 What can I help you with today?",
          timestamp: new Date(),
        }])
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
  }, [userId, chatId, detectedTimezone])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const switchChat = (chat: ChatInfo) => {
    setCurrentChat(chat)
    setChatId(chat.id)
    localStorage.setItem('bleeps_current_chat_id', chat.id)
    setShowChatPicker(false)
  }

  const shareGroup = async (group: ChatInfo, e: React.MouseEvent) => {
    e.stopPropagation()
    const inviteUrl = `${window.location.origin}/join/${group.invite_code}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on Bleeps`,
          text: `You've been invited to join ${group.name}!`,
          url: inviteUrl,
        })
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(inviteUrl)
        }
      }
    } else {
      await copyToClipboard(inviteUrl)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }

  const copyGroupLink = async (group: ChatInfo, e: React.MouseEvent) => {
    e.stopPropagation()
    const inviteUrl = `${window.location.origin}/join/${group.invite_code}`
    await copyToClipboard(inviteUrl)
    setCopiedGroupId(group.id)
    setTimeout(() => setCopiedGroupId(null), 2000)
  }

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
          chatId,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          detectedTimezone,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      // Update chatId if returned
      if (data.chatId && data.chatId !== chatId) {
        setChatId(data.chatId)
        localStorage.setItem('bleeps_current_chat_id', data.chatId)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Check if a group was created and refresh chats
      if (data.content.toLowerCase().includes('created group') ||
          data.content.toLowerCase().includes('share this code')) {
        const chatsResponse = await fetch(`/api/groups?userId=${userId}`)
        if (chatsResponse.ok) {
          const chatsData = await chatsResponse.json()
          setChats({
            solo: chatsData.soloChat,
            groups: chatsData.groups || []
          })
        }
      }
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
      {/* Header with Chat Switcher */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card safe-top">
        <div className="relative">
          <button
            onClick={() => setShowChatPicker(!showChatPicker)}
            className="flex items-center gap-2 text-base font-semibold hover:bg-muted px-2 py-1.5 rounded-lg transition-colors"
          >
            {currentChat?.type === 'group' ? (
              <Users className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
            <span>{currentChat?.name || 'Bleeps'}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Chat Picker Dropdown */}
          {showChatPicker && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50">
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-2 py-1.5 uppercase tracking-wide font-medium">Your Chats</p>

                {/* Solo Chat */}
                {chats.solo && (
                  <button
                    onClick={() => switchChat(chats.solo!)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors ${
                      currentChat?.id === chats.solo.id ? 'bg-muted' : ''
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm">Personal</span>
                  </button>
                )}

                {/* Groups */}
                {chats.groups.length > 0 && (
                  <>
                    <div className="border-t border-border my-2" />
                    <p className="text-xs text-muted-foreground px-2 py-1.5 uppercase tracking-wide font-medium">Groups</p>
                    {chats.groups.map((group) => (
                      <div
                        key={group.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors ${
                          currentChat?.id === group.id ? 'bg-muted' : ''
                        }`}
                      >
                        <button
                          onClick={() => switchChat({ ...group, type: 'group' })}
                          className="flex-1 flex items-center gap-3"
                        >
                          <Users className="h-4 w-4" />
                          <span className="text-sm">{group.name}</span>
                          {group.role === 'owner' && (
                            <span className="text-xs text-muted-foreground">owner</span>
                          )}
                        </button>
                        {group.role === 'owner' && group.invite_code && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => copyGroupLink({ ...group, type: 'group' }, e)}
                              className="p-1.5 hover:bg-background rounded-md transition-colors"
                              aria-label={`Copy invite link for ${group.name}`}
                            >
                              {copiedGroupId === group.id ? (
                                <Check className="h-4 w-4 text-green-400" />
                              ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            {'share' in navigator && (
                              <button
                                onClick={(e) => shareGroup({ ...group, type: 'group' }, e)}
                                className="p-1.5 hover:bg-background rounded-md transition-colors"
                                aria-label={`Share ${group.name}`}
                              >
                                <Share2 className="h-4 w-4 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* Create Group Hint */}
                <div className="border-t border-border mt-2 pt-2">
                  <p className="text-xs text-muted-foreground px-3 py-2">
                    Say &quot;create a group called [name]&quot; to make a new group
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current chat indicator for groups */}
        {currentChat?.type === 'group' && (
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
            Group
          </span>
        )}
      </header>

      {/* Click outside to close dropdown */}
      {showChatPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowChatPicker(false)}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4 safe-bottom">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentChat?.type === 'group'
                ? `Message ${currentChat.name}...`
                : "Message Bleeps..."}
              rows={1}
              className="w-full resize-none rounded-2xl border border-border bg-muted px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
              style={{ maxHeight: '120px' }}
            />
            <button
              type="button"
              className="absolute right-3 bottom-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Voice input"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center h-11 w-11 rounded-full bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
