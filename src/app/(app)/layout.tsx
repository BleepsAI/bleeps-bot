'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, CheckSquare, Bell, Settings } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const tabs = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/inbox', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { authUser } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!authUser?.id) return

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/inbox?userId=${authUser.id}`)
        if (response.ok) {
          const data = await response.json()
          const unread = (data.items || []).filter((item: { isRead: boolean }) => !item.isRead).length
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()
    // Refresh count when navigating away from inbox
    if (pathname !== '/inbox') {
      const interval = setInterval(fetchUnreadCount, 30000) // every 30s
      return () => clearInterval(interval)
    }
  }, [authUser?.id, pathname])

  // Poll for count while on inbox page (picks up read status changes)
  useEffect(() => {
    if (pathname === '/inbox' && authUser?.id) {
      const refreshCount = async () => {
        try {
          const response = await fetch(`/api/inbox?userId=${authUser.id}`)
          if (response.ok) {
            const data = await response.json()
            const unread = (data.items || []).filter((item: { isRead: boolean }) => !item.isRead).length
            setUnreadCount(unread)
          }
        } catch (error) {
          console.error('Error refreshing unread count:', error)
        }
      }
      // Poll every 3 seconds while on inbox
      const interval = setInterval(refreshCount, 3000)
      return () => clearInterval(interval)
    }
  }, [pathname, authUser?.id])

  return (
    <div className="flex flex-col h-screen-safe">
      {/* Main content */}
      <main className="flex-1-safe overflow-hidden">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 flex h-14 border-t border-border bg-background safe-bottom">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon
          const showBadge = tab.href === '/inbox' && unreadCount > 0
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex items-center justify-center transition-colors relative ${
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={tab.label}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              {showBadge && (
                <span className="absolute top-2 right-1/2 translate-x-4 min-w-[18px] h-[18px] flex items-center justify-center text-[11px] font-semibold bg-red-500 text-white rounded-full px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
