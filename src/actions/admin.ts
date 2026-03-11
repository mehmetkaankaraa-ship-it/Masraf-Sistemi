// src/actions/admin.ts
'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import type { Role } from '@prisma/client'

const createUserSchema = z.object({
  name:     z.string().min(2, 'Ad en az 2 karakter olmalı.'),
  email:    z.string().email('Geçerli bir e-posta girin.'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı.'),
  role:     z.enum(['ADMIN', 'USER']),
})

type CreateUserResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string }

export async function createUser(raw: unknown): Promise<CreateUserResult> {
  await requireRole('ADMIN')

  const parsed = createUserSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Geçersiz veri.' }
  }

  const { name, email, password, role } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { success: false, error: 'Bu e-posta adresi zaten kullanımda.' }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role as Role },
    select: { id: true },
  })

  revalidatePath('/admin/users')
  return { success: true, data: { id: user.id } }
}

const updateUserSchema = z.object({
  name:     z.string().min(2, 'Ad en az 2 karakter olmalı.'),
  email:    z.string().email('Geçerli bir e-posta girin.'),
  role:     z.enum(['ADMIN', 'USER']),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı.').optional().or(z.literal('')),
})

export async function updateUser(id: string, raw: unknown): Promise<CreateUserResult> {
  await requireRole('ADMIN')

  const parsed = updateUserSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Geçersiz veri.' }
  }

  const { name, email, role, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'Kullanıcı bulunamadı.' }

  if (email !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email } })
    if (conflict) return { success: false, error: 'Bu e-posta adresi zaten kullanımda.' }
  }

  if (existing.role === 'ADMIN' && role === 'USER') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) {
      return { success: false, error: 'Sistemde en az bir yönetici olmalı.' }
    }
  }

  const data: Record<string, unknown> = { name, email, role: role as Role }
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  const updated = await prisma.user.update({ where: { id }, data, select: { id: true } })

  revalidatePath('/admin/users')
  return { success: true, data: { id: updated.id } }
}

export async function deleteUser(id: string): Promise<CreateUserResult> {
  const session = await requireRole('ADMIN')

  if ((session as any).user?.id === id) {
    return { success: false, error: 'Kendi hesabınızı silemezsiniz.' }
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return { success: false, error: 'Kullanıcı bulunamadı.' }

  if (existing.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) {
      return { success: false, error: 'Sistemde en az bir yönetici olmalı.' }
    }
  }

  const [clientCount, projectCount, txCount, transferCount] = await Promise.all([
    prisma.client.count({ where: { createdById: id } }),
    prisma.project.count({ where: { createdById: id } }),
    prisma.ledgerTransaction.count({ where: { createdById: id } }),
    prisma.employeeAdvanceTransfer.count({
      where: { OR: [{ receiverId: id }, { sentById: id }] },
    }),
  ])

  const total = clientCount + projectCount + txCount + transferCount
  if (total > 0) {
    return {
      success: false,
      error: `Bu kullanıcı sistemde ${total} kayda sahip. Kullanıcı silinemez.`,
    }
  }

  await prisma.user.delete({ where: { id } })

  revalidatePath('/admin/users')
  return { success: true, data: { id } }
}

export async function toggleUserActive(id: string): Promise<CreateUserResult> {
  const session = await requireRole('ADMIN')

  if ((session as any).user?.id === id) {
    return { success: false, error: 'Kendi hesabınızı devre dışı bırakamazsınız.' }
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } })
  if (!existing) return { success: false, error: 'Kullanıcı bulunamadı.' }

  // Guard: can't deactivate last admin
  if (existing.isActive && existing.role === 'ADMIN') {
    const activeAdminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
    if (activeAdminCount <= 1) {
      return { success: false, error: 'Sistemde en az bir aktif yönetici olmalı.' }
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !existing.isActive },
    select: { id: true },
  })

  revalidatePath('/admin/users')
  return { success: true, data: { id: updated.id } }
}

export async function getOnlineUsers() {
  await requireRole('ADMIN')
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000)
  return prisma.user.findMany({
    where: { lastActiveAt: { gte: tenMinsAgo } },
    select: { id: true, name: true, email: true, role: true, lastActiveAt: true },
    orderBy: { lastActiveAt: 'desc' },
  })
}

export async function getRecentActivity(limit = 20) {
  await requireRole('ADMIN')

  const transactions = await prisma.ledgerTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id:          true,
      type:        true,
      amount:      true,
      description: true,
      createdAt:   true,
      updatedAt:   true,
      client:      { select: { id: true, name: true } },
      project:     { select: { id: true, title: true } },
      createdBy:   { select: { id: true, name: true } },
    },
  })

  return transactions
}
