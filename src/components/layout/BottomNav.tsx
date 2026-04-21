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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white flex items-stretch"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderTop: '1px solid hsl(231 20% 88%)',
      }}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className="relative flex flex-col items-center justify-center flex-1 gap-0.5 py-2 min-h-[56px] transition-colors"
            style={{ color: active ? 'hsl(219 100% 55%)' : 'hsl(231 15% 52%)' }}
          >
            <Icon className={`h-5 w-5 shrink-0 ${active ? 'opacity-100' : 'opacity-55'}`} />
            <span className={`text-[10px] font-medium leading-none ${active ? 'opacity-100' : 'opacity-65'}`}>
              {label}
            </span>
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full"
                style={{ backgroundColor: 'hsl(219 100% 55%)' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
