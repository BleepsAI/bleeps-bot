'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowRight, Mic, ChevronDown, Users, User, Share2, Copy, Check, X, Pencil, Trash2, Loader2, BarChart3, MoreVertical, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import PollCard from '@/components/PollCard'
import CreatePollModal from '@/components/CreatePollModal'
import {
  generateChatKey,
  exportKey,
  importKey,
  storeChatKey,
  getChatKey,
  hasChatKey,
  encryptForPrivateChat,
  decryptMessagesForDisplay,
  extractKeyFromHash,
  createKeyHash,
  importServerPublicKey,
} from '@/lib/crypto'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  senderId?: string
  senderName?: string
  isOwnMessage?: boolean
  encrypted?: boolean
  iv?: string
  decryptionError?: boolean
}

interface PollInfo {
  id: string
  createdAt: Date
}

interface ChatInfo {
  id: string
  type: 'solo' | 'group'
  name: string
  role?: string
  invite_code?: string
  privacy_level?: 'open' | 'private' | 'sealed'
  encryption_enabled?: boolean
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
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [polls, setPolls] = useState<PollInfo[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  // E2E Encryption state
  const [chatKey, setChatKey] = useState<CryptoKey | null>(null)
  const [serverPublicKey, setServerPublicKey] = useState<CryptoKey | null>(null)
  const [keyMissing, setKeyMissing] = useState(false)
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch server public key on mount (for @bleeps encryption)
  useEffect(() => {
    const fetchServerKey = async () => {
      try {
        const response = await fetch('/api/crypto')
        if (response.ok) {
          const data = await response.json()
          if (data.enabled && data.publicKey) {
            const key = await importServerPublicKey(data.publicKey)
            setServerPublicKey(key)
          }
        }
      } catch (error) {
        console.error('Failed to fetch server public key:', error)
      }
    }
    fetchServerKey()
  }, [])

  // Load encryption key when switching to a private chat
  useEffect(() => {
    const loadChatKey = async () => {
      if (!currentChat?.encryption_enabled || !chatId) {
        setChatKey(null)
        setKeyMissing(false)
        return
      }

      // Check URL hash for key (when joining via invite link)
      if (typeof window !== 'undefined') {
        const hashKey = extractKeyFromHash(window.location.hash)
        if (hashKey) {
          try {
            const key = await importKey(hashKey)
            storeChatKey(chatId, hashKey)
            setChatKey(key)
            setKeyMissing(false)
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname)
            return
          } catch (error) {
            console.error('Failed to import key from URL:', error)
          }
        }
      }

      // Try to load from localStorage
      const storedKey = getChatKey(chatId)
      if (storedKey) {
        try {
          const key = await importKey(storedKey)
          setChatKey(key)
          setKeyMissing(false)
        } catch (error) {
          console.error('Failed to import stored key:', error)
          setKeyMissing(true)
        }
      } else if (currentChat.role === 'owner') {
        // Owner doesn't have a key yet - generate one
        try {
          const newKey = await generateChatKey()
          const exportedKey = await exportKey(newKey)
          storeChatKey(chatId, exportedKey)
          setChatKey(newKey)
          setKeyMissing(false)
          console.log('Generated new encryption key for private group')
        } catch (error) {
          console.error('Failed to generate encryption key:', error)
          setKeyMissing(true)
        }
      } else {
        // Non-owner without key - they need the invite link
        setKeyMissing(true)
      }
    }

    loadChatKey()
  }, [currentChat, chatId])

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
            // We have existing messages
            let processedMessages = messagesData.messages.map((m: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string; senderId?: string; senderName?: string; isOwnMessage?: boolean; encrypted?: boolean; iv?: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
              senderId: m.senderId,
              senderName: m.senderName,
              isOwnMessage: m.isOwnMessage,
              encrypted: m.encrypted,
              iv: m.iv,
            }))

            // Decrypt messages if this is an encrypted chat
            if (currentChat?.encryption_enabled && chatKey) {
              processedMessages = await decryptMessagesForDisplay(processedMessages, chatKey)
            }

            setMessages(processedMessages)
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

  // Fetch polls for chat
  useEffect(() => {
    if (!chatId) {
      setPolls([])
      return
    }

    const fetchPolls = async () => {
      try {
        const response = await fetch(`/api/polls?chatId=${chatId}`)
        if (response.ok) {
          const data = await response.json()
          const pollInfos = (data.polls || []).map((p: { id: string; created_at: string }) => ({
            id: p.id,
            createdAt: new Date(p.created_at)
          }))
          setPolls(pollInfos)
        }
      } catch (error) {
        console.error('Error fetching polls:', error)
      }
    }

    fetchPolls()
  }, [chatId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, polls])

  const switchChat = (chat: ChatInfo) => {
    setCurrentChat(chat)
    setChatId(chat.id)
    localStorage.setItem('bleeps_current_chat_id', chat.id)
    setShowChatPicker(false)
  }

  // Get invite URL for a group, including encryption key for private groups
  const getInviteUrl = (group: ChatInfo): string => {
    let inviteUrl = `${window.location.origin}/join/${group.invite_code}`

    // For encrypted groups, include the key in the hash
    if (group.encryption_enabled && group.id) {
      const key = getChatKey(group.id)
      if (key) {
        inviteUrl += createKeyHash(key)
      }
    }

    return inviteUrl
  }

  const shareGroup = async (group: ChatInfo, e: React.MouseEvent) => {
    e.stopPropagation()
    const inviteUrl = getInviteUrl(group)

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
    const inviteUrl = getInviteUrl(group)
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

  const enableEncryption = async () => {
    if (!currentChat || currentChat.encryption_enabled) return

    setGroupActionLoading(true)
    try {
      // Generate encryption key first
      const newKey = await generateChatKey()
      const exportedKey = await exportKey(newKey)

      // Update group privacy in database
      const response = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: currentChat.id,
          userId,
          privacy_level: 'private'
        })
      })

      if (response.ok) {
        // Store the key locally
        storeChatKey(currentChat.id, exportedKey)
        setChatKey(newKey)
        setKeyMissing(false)

        // Update local state
        const updatedChat = {
          ...currentChat,
          privacy_level: 'private' as const,
          encryption_enabled: true
        }
        setCurrentChat(updatedChat)
        setChats(prev => ({
          ...prev,
          groups: prev.groups.map(g =>
            g.id === currentChat.id ? updatedChat : g
          )
        }))
      }
    } catch (error) {
      console.error('Error enabling encryption:', error)
    } finally {
      setGroupActionLoading(false)
    }
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Transcription API error:', result)
        throw new Error(result.details || result.error || 'Transcription failed')
      }

      if (result.text) {
        // Append to existing input or set new
        setInput(prev => prev ? `${prev} ${result.text}` : result.text)
        inputRef.current?.focus()
      }
    } catch (error) {
      console.error('Transcription error:', error)
      alert(`Failed to transcribe: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const messageContent = input.trim()

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Build request body
      interface ChatRequestBody {
        userId: string
        chatId: string | null
        messages: Array<{ role: string; content: string }>
        detectedTimezone: string | null
        encrypted?: boolean
        iv?: string
        bleepsContent?: string
        bleepsIv?: string
        bleepsEphemeralKey?: string
      }

      const requestBody: ChatRequestBody = {
        userId,
        chatId,
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        detectedTimezone,
      }

      // Encrypt if this is a private chat
      if (currentChat?.encryption_enabled && chatKey) {
        const encrypted = await encryptForPrivateChat(
          messageContent,
          chatKey,
          serverPublicKey || undefined
        )
        requestBody.encrypted = true
        requestBody.iv = encrypted.iv
        // Override the last message with encrypted content
        requestBody.messages[requestBody.messages.length - 1].content = encrypted.content
        // Include @bleeps encrypted content if present
        if (encrypted.bleepsContent) {
          requestBody.bleepsContent = encrypted.bleepsContent
          requestBody.bleepsIv = encrypted.bleepsIv
          requestBody.bleepsEphemeralKey = encrypted.bleepsEphemeralKey
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      // Update chatId if returned
      if (data.chatId && data.chatId !== chatId) {
        setChatId(data.chatId)
        localStorage.setItem('bleeps_current_chat_id', data.chatId)
      }

      // For encrypted messages without @bleeps, there's no AI response
      if (data.encrypted && !data.content) {
        // Message was saved encrypted, no AI response expected
        return
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

      // Check if a poll was created and refresh polls
      if (data.content.toLowerCase().includes('poll created') && chatId) {
        const pollsResponse = await fetch(`/api/polls?chatId=${chatId}`)
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json()
          setPolls((pollsData.polls || []).map((p: { id: string; created_at: string }) => ({
            id: p.id,
            createdAt: new Date(p.created_at)
          })))
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

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, userId })
      })
      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId))
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
    setOpenMenuId(null)
  }

  const deletePoll = async (pollId: string) => {
    try {
      const response = await fetch('/api/polls', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, userId })
      })
      if (response.ok) {
        setPolls(prev => prev.filter(p => p.id !== pollId))
      }
    } catch (error) {
      console.error('Error deleting poll:', error)
    }
    setOpenMenuId(null)
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
                          {group.encryption_enabled && (
                            <Lock className="h-3 w-3 text-green-500" />
                          )}
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
                    Say &quot;create a group called [name]&quot; or &quot;create a private group called [name]&quot; for E2E encryption
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current chat indicator for groups - clickable to open details */}
        <div className="flex items-center gap-2">
          {/* Encryption indicator */}
          {currentChat?.encryption_enabled && (
            <div className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              <Lock className="h-3 w-3" />
              <span>E2E</span>
            </div>
          )}
          {currentChat?.type === 'group' && (
            <button
              onClick={openGroupDetails}
              className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium hover:bg-muted/80 transition-colors"
            >
              Group Settings
            </button>
          )}
        </div>
      </header>

      {/* Key missing warning */}
      {keyMissing && currentChat?.encryption_enabled && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
          <p className="text-sm text-yellow-500 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Encryption key not found. Ask the group owner for a new invite link to view messages.
          </p>
        </div>
      )}

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
                  <div className="flex items-center gap-2">
                    <span className="text-base">{currentChat.name}</span>
                    {currentChat.encryption_enabled && (
                      <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <Lock className="h-3 w-3" />
                        E2E
                      </span>
                    )}
                  </div>
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

            {/* Privacy / Encryption */}
            <div className="mb-6">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Privacy
              </label>
              {currentChat.encryption_enabled ? (
                <div className="mt-2 p-3 bg-green-500/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-500 font-medium mb-1">
                    <Lock className="h-4 w-4" />
                    End-to-End Encrypted
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Messages are encrypted before leaving your device. Only group members with the key can read them. Type @bleeps to ask the AI for help.
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Open Group</div>
                      <p className="text-xs text-muted-foreground">AI has full access to messages</p>
                    </div>
                    {currentChat.role === 'owner' && (
                      <button
                        onClick={enableEncryption}
                        disabled={groupActionLoading}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {groupActionLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        Make Private
                      </button>
                    )}
                  </div>
                  {currentChat.role === 'owner' && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Private groups use E2E encryption. Only @bleeps mentions will be visible to AI.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Invite Link */}
            {currentChat.role === 'owner' && currentChat.invite_code && (
              <div className="mb-6">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Invite Link {currentChat.encryption_enabled && '(includes encryption key)'}
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm truncate">
                    {getInviteUrl(currentChat)}
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

      {/* Create Poll Modal */}
      {showCreatePoll && chatId && (
        <CreatePollModal
          chatId={chatId}
          userId={userId}
          onClose={() => setShowCreatePoll(false)}
          onCreated={async () => {
            // Refetch all polls to ensure consistency
            const response = await fetch(`/api/polls?chatId=${chatId}`)
            if (response.ok) {
              const data = await response.json()
              setPolls((data.polls || []).map((p: { id: string; created_at: string }) => ({
                id: p.id,
                createdAt: new Date(p.created_at)
              })))
            }
          }}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Combine messages and polls, sorted by timestamp */}
        {(() => {
          type FeedItem =
            | { type: 'message'; data: Message; timestamp: Date }
            | { type: 'poll'; data: PollInfo; timestamp: Date }

          const feed: FeedItem[] = [
            ...messages.map(m => ({ type: 'message' as const, data: m, timestamp: m.timestamp })),
            ...polls.map(p => ({ type: 'poll' as const, data: p, timestamp: p.createdAt }))
          ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

          return feed.map((item, index) => {
            if (item.type === 'poll') {
              const pollId = item.data.id
              const isMenuOpen = openMenuId === `poll-${pollId}`
              return (
                <div key={`poll-${pollId}`} className="relative group">
                  <PollCard pollId={pollId} userId={userId} />
                  <button
                    onClick={() => setOpenMenuId(isMenuOpen ? null : `poll-${pollId}`)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute top-8 right-2 bg-card border border-border rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                        <button
                          onClick={() => deletePoll(pollId)}
                          className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-muted flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            }

            const message = item.data
            const isOwnMessage = message.role === 'user' && message.isOwnMessage !== false
            const isOtherUser = message.role === 'user' && message.isOwnMessage === false
            const isBleeps = message.role === 'assistant'
            const isMenuOpen = openMenuId === `msg-${message.id}`

            // Show sender name in group chats for Bleeps and other users (not your own messages)
            const showSenderName = currentChat?.type === 'group' && !isOwnMessage

            // Check if previous item was a message from the same sender
            const prevItem = feed[index - 1]
            const prevMessage = prevItem?.type === 'message' ? prevItem.data : null
            const sameSenderAsPrev = prevMessage && (
              (isBleeps && prevMessage.role === 'assistant') ||
              (isOtherUser && prevMessage.role === 'user' && prevMessage.senderId === message.senderId)
            )

            // Alignment: your messages right, everyone else left
            const alignRight = isOwnMessage

            return (
              <div
                key={message.id}
                className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'} group relative`}
              >
                {showSenderName && !sameSenderAsPrev && (
                  <span className="text-xs text-muted-foreground mb-1 px-1">
                    {isBleeps ? 'Bleeps' : message.senderName}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  {/* Menu button for own messages - appears on left */}
                  {isOwnMessage && (
                    <button
                      onClick={() => setOpenMenuId(isMenuOpen ? null : `msg-${message.id}`)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
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
                    <p className="whitespace-pre-wrap leading-normal">{message.content}</p>
                  </div>
                </div>
                {/* Dropdown menu */}
                {isMenuOpen && isOwnMessage && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute top-6 right-0 bg-card border border-border rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-muted flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })
        })()}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          {/* Poll button for groups */}
          {currentChat?.type === 'group' && (
            <button
              onClick={() => setShowCreatePoll(true)}
              className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              aria-label="Create poll"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
          )}
          {/* Voice recording button */}
          <button
            onClick={toggleRecording}
            disabled={isTranscribing}
            className={`flex-shrink-0 p-2 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : isTranscribing
                  ? 'bg-muted text-muted-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
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
            <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
