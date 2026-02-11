'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, ChevronDown, Users, User, Share2, Copy, Check, X, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  senderId?: string
  senderName?: string
  isOwnMessage?: boolean
}

interface ChatInfo {
  id: string
  type: 'solo' | 'group'
  name: string
  role?: string
  invite_code?: string
}

export default function ChatPage() {
  const { authUser } = useAuth()
  const userId = authUser?.id || 'anonymous'
  const [chatId, setChatId] = useState<string | null>(null)
  const [currentChat, setCurrentChat] = useState<ChatInfo | null>(null)
  const [chats, setChats] = useState<{ solo: ChatInfo | null; groups: ChatInfo[] }>({ solo: null, groups: [] })
  const [showChatPicker, setShowChatPicker] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null)
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null)
  const [showGroupDetails, setShowGroupDetails] = useState(false)
  const [editingGroupName, setEditingGroupName] = useState(false)
  const [groupNameInput, setGroupNameInput] = useState('')
  const [groupActionLoading, setGroupActionLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch chats on mount
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setDetectedTimezone(tz)

    if (!userId || userId === 'anonymous') return

    // Fetch user's chats
    const fetchChats = async () => {
      try {
        const response = await fetch(`/api/groups?userId=${userId}`)
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
  }, [userId])

  // Fetch messages or greeting when chatId changes
  useEffect(() => {
    if (!userId || userId === 'anonymous' || !chatId) return

    const fetchMessages = async () => {
      setIsLoading(true)

      try {
        // First, try to fetch existing messages
        const messagesResponse = await fetch(`/api/messages?chatId=${chatId}&limit=50&userId=${userId}`)

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()

          if (messagesData.messages && messagesData.messages.length > 0) {
            // We have existing messages, show them
            setMessages(messagesData.messages.map((m: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string; senderId?: string; senderName?: string; isOwnMessage?: boolean }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
              senderId: m.senderId,
              senderName: m.senderName,
              isOwnMessage: m.isOwnMessage,
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

  const openGroupDetails = () => {
    if (currentChat?.type === 'group') {
      setGroupNameInput(currentChat.name)
      setShowGroupDetails(true)
      setShowChatPicker(false)
    }
  }

  const updateGroupName = async () => {
    if (!currentChat || !groupNameInput.trim() || groupNameInput === currentChat.name) {
      setEditingGroupName(false)
      return
    }

    setGroupActionLoading(true)
    try {
      const response = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: currentChat.id,
          userId,
          name: groupNameInput.trim()
        })
      })

      if (response.ok) {
        // Update local state
        setCurrentChat({ ...currentChat, name: groupNameInput.trim() })
        setChats(prev => ({
          ...prev,
          groups: prev.groups.map(g =>
            g.id === currentChat.id ? { ...g, name: groupNameInput.trim() } : g
          )
        }))
        setEditingGroupName(false)
      }
    } catch (error) {
      console.error('Error updating group:', error)
    } finally {
      setGroupActionLoading(false)
    }
  }

  const deleteGroup = async () => {
    if (!currentChat || !confirm('Are you sure you want to delete this group? This cannot be undone.')) {
      return
    }

    setGroupActionLoading(true)
    try {
      const response = await fetch('/api/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: currentChat.id,
          userId
        })
      })

      if (response.ok) {
        // Switch to solo chat
        setShowGroupDetails(false)
        setChats(prev => ({
          ...prev,
          groups: prev.groups.filter(g => g.id !== currentChat.id)
        }))
        if (chats.solo) {
          switchChat(chats.solo)
        }
      }
    } catch (error) {
      console.error('Error deleting group:', error)
    } finally {
      setGroupActionLoading(false)
    }
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
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-border bg-background safe-top">
        <div className="relative flex items-center gap-1">
          <span className="text-base font-semibold">Bleeps</span>
          <button
            onClick={() => setShowChatPicker(!showChatPicker)}
            className="flex items-center gap-1.5 text-base text-muted-foreground hover:bg-muted px-2 py-1.5 rounded-lg transition-colors"
          >
            <span>{currentChat?.name || 'Personal'}</span>
            <ChevronDown className="h-4 w-4" />
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

        {/* Current chat indicator for groups - clickable to open details */}
        {currentChat?.type === 'group' && (
          <button
            onClick={openGroupDetails}
            className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium hover:bg-muted/80 transition-colors"
          >
            Group Settings
          </button>
        )}
      </header>

      {/* Group Details Modal */}
      {showGroupDetails && currentChat?.type === 'group' && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setShowGroupDetails(false)
              setEditingGroupName(false)
            }}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-card border border-border rounded-2xl shadow-xl z-50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Group Settings</h2>
              <button
                onClick={() => {
                  setShowGroupDetails(false)
                  setEditingGroupName(false)
                }}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Group Name */}
            <div className="mb-6">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Group Name
              </label>
              {editingGroupName ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateGroupName()
                      if (e.key === 'Escape') {
                        setEditingGroupName(false)
                        setGroupNameInput(currentChat.name)
                      }
                    }}
                  />
                  <button
                    onClick={updateGroupName}
                    disabled={groupActionLoading}
                    className="p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                  >
                    {groupActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditingGroupName(false)
                      setGroupNameInput(currentChat.name)
                    }}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-base">{currentChat.name}</span>
                  {currentChat.role === 'owner' && (
                    <button
                      onClick={() => setEditingGroupName(true)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Invite Link */}
            {currentChat.role === 'owner' && currentChat.invite_code && (
              <div className="mb-6">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Invite Link
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm truncate">
                    {`${window.location.origin}/join/${currentChat.invite_code}`}
                  </code>
                  <button
                    onClick={(e) => copyGroupLink(currentChat, e)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    {copiedGroupId === currentChat.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Delete Group */}
            {currentChat.role === 'owner' && (
              <div className="pt-4 border-t border-border">
                <button
                  onClick={deleteGroup}
                  disabled={groupActionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {groupActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Group
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Click outside to close dropdown */}
      {showChatPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowChatPicker(false)}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message, index) => {
          const isOwnMessage = message.role === 'user' && message.isOwnMessage !== false
          const isOtherUser = message.role === 'user' && message.isOwnMessage === false
          const isBleeps = message.role === 'assistant'

          // Show sender name in group chats for Bleeps and other users (not your own messages)
          const showSenderName = currentChat?.type === 'group' && !isOwnMessage

          // Check if previous message was from the same sender (to avoid repeating names)
          const prevMessage = messages[index - 1]
          const sameSenderAsPrev = prevMessage && (
            (isBleeps && prevMessage.role === 'assistant') ||
            (isOtherUser && prevMessage.role === 'user' && prevMessage.senderId === message.senderId)
          )

          // Alignment: your messages right, everyone else left
          const alignRight = isOwnMessage

          return (
            <div
              key={message.id}
              className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'}`}
            >
              {showSenderName && !sameSenderAsPrev && (
                <span className="text-xs text-muted-foreground mb-1 px-1">
                  {isBleeps ? 'Bleeps' : message.senderName}
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground'
                    : isBleeps
                      ? 'bg-muted text-foreground'
                      : 'bg-card text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          )
        })}
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
      <div className="border-t border-border bg-background safe-bottom" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentChat?.type === 'group'
              ? `Message ${currentChat.name}...`
              : "Message Bleeps..."}
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              borderRadius: '16px',
              border: '1px solid #3f3f46',
              backgroundColor: 'var(--muted)',
              padding: '10px 16px',
              fontSize: '16px',
              maxHeight: '120px',
              display: 'block',
              margin: 0
            }}
            className="placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              height: '42px',
              width: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              margin: 0
            }}
            className="bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
