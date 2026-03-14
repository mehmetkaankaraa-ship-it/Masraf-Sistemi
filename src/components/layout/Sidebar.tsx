// src/components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FolderOpen, Receipt,
  Banknote, BookOpen, BarChart3, Settings,
  Scale, ShieldCheck, Landmark, History, X,
} from 'lucide-react'
import type { Role } from '@prisma/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/clients',   label: 'Müvekkiller',  icon: Users           },
  { href: '/projects',  label: 'Projeler',     icon: FolderOpen      },
  { href: '/expenses',  label: 'Giderler',     icon: Receipt         },
  { href: '/advances',  label: 'Avanslar',     icon: Banknote        },
  { href: '/ledger',    label: 'Defter',       icon: BookOpen        },
  { href: '/reports',   label: 'Raporlar',     icon: BarChart3       },
  { href: '/settings',  label: 'Ayarlar',      icon: Settings        },
]

const adminItems = [
  { href: '/admin/users',    label: 'Kullanıcılar', icon: ShieldCheck },
  { href: '/admin/accounts', label: 'Hesaplar',     icon: Landmark    },
  { href: '/admin/audit',    label: 'Denetim',      icon: History     },
]

interface SidebarProps {
  role: Role
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'flex flex-col h-full select-none shrink-0',
          // Mobile: fixed drawer that slides in from left
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
          // Desktop: static, back in flex flow, no animation needed
          'lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ width: '216px', background: 'hsl(var(--sidebar-bg))' }}
      >
        {/* Logo */}
        <div
          className="h-[52px] flex items-center justify-between px-4 shrink-0"
          style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Scale className="w-[15px] h-[15px] text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white tracking-tight leading-none">MasrafLedger</p>
              <p className="text-[10px] text-white/35 mt-0.5 tracking-wide">Hukuk Ofisi</p>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Menüyü kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onClose} />
          ))}

          {role === 'ADMIN' && (
            <>
              <div className="pt-4 pb-1 px-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  Yönetim
                </p>
              </div>
              {adminItems.map((item) => (
                <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onClose} />
              ))}
            </>
          )}
        </nav>
      </aside>
    </>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors duration-100',
        active
          ? 'text-white'
          : 'text-white/50 hover:text-white/85 hover:bg-white/[0.06]',
      ].join(' ')}
      style={active ? { backgroundColor: 'hsl(219 100% 55% / 0.18)' } : undefined}
    >
      {/* Electric Blue left-border indicator for active item */}
      {active && (
        <span
          className="absolute left-0 inset-y-1 w-[3px] rounded-r-full"
          style={{ backgroundColor: 'hsl(219 100% 55%)' }}
        />
      )}
      <Icon
        className={[
          'h-[15px] w-[15px] shrink-0 transition-opacity',
          active ? 'opacity-100' : 'opacity-60',
        ].join(' ')}
      />
      {label}
    </Link>
  )
}
