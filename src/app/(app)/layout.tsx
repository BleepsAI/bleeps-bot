'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Inbox, CheckSquare, Settings } from 'lucide-react'

const tabs = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

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
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex items-center justify-center transition-colors ${
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={tab.label}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
