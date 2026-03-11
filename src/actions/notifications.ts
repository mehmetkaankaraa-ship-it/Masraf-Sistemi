// src/actions/notifications.ts
'use server'

import { prisma } from '@/lib/prisma'
import { requireCurrentUser } from '@/lib/current-user'

/** Internal helper — create a notification for any user by ID. */
export async function createNotification(userId: string, title: string, message: string) {
  await prisma.notification.create({ data: { userId, title, message } })
}

/** Return latest 20 notifications for the current user. */
export async function getUserNotifications() {
  const user = await requireCurrentUser()
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

/** Return unread notification count for the current user. */
export async function getUnreadCount() {
  const user = await requireCurrentUser()
  return prisma.notification.count({ where: { userId: user.id, read: false } })
}

/** Mark a single notification as read (must belong to current user). */
export async function markNotificationRead(id: string) {
  const user = await requireCurrentUser()
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  })
}

/** Mark all unread notifications as read for the current user. */
export async function markAllNotificationsRead() {
  const user = await requireCurrentUser()
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  })
}
