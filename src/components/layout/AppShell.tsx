'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Toaster } from '@/components/ui/toaster'
import type { Role } from '@prisma/client'

interface AppShellProps {
  role: Role
  user: { name?: string | null; email?: string | null; role: string }
  unreadCount?: number
  children: React.ReactNode
}

export function AppShell({ role, user, unreadCount = 0, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar whenever route changes (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          user={user}
          unreadCount={unreadCount}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  )
}
