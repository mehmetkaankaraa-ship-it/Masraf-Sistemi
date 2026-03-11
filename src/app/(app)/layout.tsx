// src/app/(app)/layout.tsx
import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const email = session.user.email!

  // Update lastActiveAt + fetch unread notification count in one round-trip
  const [, unreadCount] = await Promise.all([
    prisma.user.update({
      where: { email },
      data: { lastActiveAt: new Date() },
      select: { id: true },
    }),
    prisma.notification.count({ where: { user: { email }, read: false } }),
  ])

  return (
    <AppShell role={session.user.role} user={session.user} unreadCount={unreadCount}>
      {children}
    </AppShell>
  )
}
