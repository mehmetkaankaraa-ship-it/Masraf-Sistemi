'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Receipt, Banknote, Settings,
} from 'lucide-react'
import type { Role } from '@prisma/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients',   label: 'Müvekkil',  icon: Users           },
  { href: '/expenses',  label: 'Giderler',  icon: Receipt         },
  { href: '/advances',  label: 'Avanslar',  icon: Banknote        },
  { href: '/settings',  label: 'Ayarlar',   icon: Settings        },
]

interface Props {
  role: Role
}

export function BottomNav({ role: _role }: Props) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className={[
              'relative flex flex-col items-center justify-center flex-1 gap-0.5 py-2 min-h-[56px] transition-colors',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            <Icon className={`h-5 w-5 shrink-0 ${active ? 'opacity-100' : 'opacity-50'}`} />
            <span className={`text-[10px] font-medium leading-none ${active ? 'opacity-100' : 'opacity-60'}`}>
              {label}
            </span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-b-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
