'use client'

import { signOut } from 'next-auth/react'
import { ChevronDown, LogOut, Search, Command, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { NotificationBell } from '@/components/layout/NotificationBell'

interface HeaderProps {
  user: { name?: string | null; email?: string | null; role: string }
  unreadCount?: number
  onMenuClick?: () => void
}

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'U'
}

export function Header({ user, unreadCount = 0, onMenuClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const initials = getInitials(user.name, user.email)
  const displayName = user.name || user.email || 'Kullanıcı'

  // Global ⌘K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <header
        className="h-[52px] bg-white flex items-center gap-2 px-3 md:px-4 shrink-0"
        style={{ borderBottom: '1px solid hsl(231 20% 88%)' }}
      >
        {/* Hamburger — mobile only (lg: hidden) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 shrink-0"
          aria-label="Menüyü aç"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Search trigger — expands to fill on mobile */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex flex-1 lg:flex-none items-center gap-2 px-3 py-1.5 bg-muted/60 rounded-lg border border-transparent hover:border-border hover:bg-muted transition-all duration-150 group lg:w-[220px]"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          <span className="flex-1 text-left text-[12px] text-muted-foreground select-none">Ara...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-medium text-muted-foreground bg-white rounded border border-border ml-1 shrink-0">
            <Command className="h-2 w-2" />K
          </kbd>
        </button>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          {/* Notification bell */}
          <NotificationBell initialCount={unreadCount} />

          {/* Avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg hover:bg-accent transition-all duration-150 group"
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-primary-foreground leading-none">
                  {initials}
                </span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[12px] font-medium text-foreground leading-tight max-w-[100px] truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight capitalize">
                  {user.role.toLowerCase()}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border shadow-lg z-50 overflow-hidden py-1">
                  <div className="px-3 py-2.5 border-b">
                    <p className="text-[12px] font-medium truncate">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-destructive hover:bg-red-50 transition-colors mt-1"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Çıkış Yap
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
