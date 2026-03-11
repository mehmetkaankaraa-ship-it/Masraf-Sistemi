'use client'

import { Bell, CheckCheck } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { getUserNotifications, markAllNotificationsRead, markNotificationRead } from '@/actions/notifications'

type Notification = {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: Date
}

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'az önce'
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`
  return `${Math.floor(diff / 86400)} gün önce`
}

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleOpen() {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    const notifs = await getUserNotifications()
    setNotifications(notifs as Notification[])
    setLoading(false)
  }

  async function handleMarkAll() {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setCount(0)
  }

  async function handleMarkOne(id: string) {
    await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setCount((c) => Math.max(0, c - 1))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
        title="Bildirimler"
      >
        <Bell className="h-[15px] w-[15px]" />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-[13px] font-semibold">Bildirimler</span>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {loading ? (
              <div className="py-8 text-center text-[12px] text-muted-foreground">Yükleniyor...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-muted-foreground">Bildirim yok.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkOne(n.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors ${!n.read ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                    <div className={!n.read ? '' : 'ml-3.5'}>
                      <p className="text-[12px] font-medium text-foreground">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
