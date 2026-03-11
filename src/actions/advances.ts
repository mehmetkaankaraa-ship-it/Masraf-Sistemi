// src/actions/advances.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireCurrentUser } from '@/lib/current-user'
import { requireRole } from '@/lib/session'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'
import type { ActionResult } from './clients'

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

const createTransferSchema = z.object({
  receiverId: z.string().cuid('Gecersiz calisan secimi.'),
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? Number(v) : v))
    .refine((n) => Number.isFinite(n) && n > 0, 'Tutar gecersiz.'),
  date: z.string().min(1, 'Tarih zorunlu.'),
  note: z.string().optional(),
  sourceAccountId: z.string().optional().nullable(),
})

const sourceAccountSchema = z.object({
  name: z.string().min(1, 'Hesap adi zorunlu.'),
  description: z.string().optional(),
  isActive: z.coerce.boolean().optional().default(true),
})

// -----------------------------------------------------------------------------
// Employee balance calculation
// -----------------------------------------------------------------------------

export async function getEmployeeBalance(employeeId: string) {
  const [transfers, expenses] = await Promise.all([
    prisma.employeeAdvanceTransfer.aggregate({
      where: { receiverId: employeeId },
      _sum: { amount: true },
    }),
    prisma.ledgerTransaction.aggregate({
      where: { createdById: employeeId, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
  ])

  const totalTransferred = transfers._sum.amount ?? new Decimal(0)
  const totalExpenses = expenses._sum.amount ?? new Decimal(0)
  const remaining = new Decimal(totalTransferred).sub(new Decimal(totalExpenses))

  return {
    totalTransferred: new Decimal(totalTransferred),
    totalExpenses: new Decimal(totalExpenses),
    remaining,
  }
}

// -----------------------------------------------------------------------------
// Get my own balance (USER)
// -----------------------------------------------------------------------------

export async function getMyAdvanceBalance() {
  const me = await requireCurrentUser()
  return getEmployeeBalance(me.id)
}

// -----------------------------------------------------------------------------
// Get my recent expenses (USER - only own)
// -----------------------------------------------------------------------------

export async function getMyRecentExpenses(limit = 10) {
  const me = await requireCurrentUser()
  return prisma.ledgerTransaction.findMany({
    where: { createdById: me.id, type: 'EXPENSE' },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      amount: true,
      date: true,
      description: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
  })
}

// -----------------------------------------------------------------------------
// Get my recent advance transfers received (USER - only own)
// -----------------------------------------------------------------------------

export async function getMyRecentTransfers(limit = 10) {
  const me = await requireCurrentUser()
  return prisma.employeeAdvanceTransfer.findMany({
    where: { receiverId: me.id },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      amount: true,
      date: true,
      note: true,
      createdAt: true,
      sourceAccount: { select: { id: true, name: true } },
      sentBy: { select: { id: true, name: true } },
    },
  })
}

// -----------------------------------------------------------------------------
// Admin: create advance transfer to employee
// -----------------------------------------------------------------------------

export async function createEmployeeAdvanceTransfer(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const me = await requireCurrentUser()
  if (me.role !== 'ADMIN') {
    return { success: false, error: 'Bu islem icin admin yetkisi gereklidir.' }
  }

  const parsed = createTransferSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { receiverId, amount, date, note, sourceAccountId } = parsed.data

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } })
  if (!receiver) {
    return { success: false, error: 'Calisan bulunamadi.' }
  }

  if (sourceAccountId) {
    const acc = await prisma.sourceAccount.findUnique({
      where: { id: sourceAccountId },
    })
    if (!acc || !acc.isActive) {
      return {
        success: false,
        error: 'Kaynak hesap bulunamadi veya pasif.',
      }
    }
  }

  const transfer = await prisma.employeeAdvanceTransfer.create({
    data: {
      amount: new Decimal(amount),
      date: new Date(date),
      note: note ?? null,
      receiverId,
      sentById: me.id,
      sourceAccountId: sourceAccountId || null,
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/advances')
  revalidatePath(`/admin/users/${receiverId}`)
  revalidatePath('/admin/users')

  return { success: true, data: { id: transfer.id } }
}

// -----------------------------------------------------------------------------
// Admin: get all employee summaries
// -----------------------------------------------------------------------------

export async function getAllEmployeeSummaries() {
  await requireRole('ADMIN')

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, lastActiveAt: true, createdAt: true },
    orderBy: { name: 'asc' },
  })

  const summaries = await Promise.all(
    users.map(async (u) => {
      const bal = await getEmployeeBalance(u.id)
      return { ...u, ...bal }
    }),
  )

  return summaries
}

// -----------------------------------------------------------------------------
// Admin: get single employee detail with transfers + expenses
// -----------------------------------------------------------------------------

export async function getEmployeeDetail(employeeId: string) {
  await requireRole('ADMIN')

  const user = await prisma.user.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  if (!user) return null

  const [transfers, expenses, balance] = await Promise.all([
    prisma.employeeAdvanceTransfer.findMany({
      where: { receiverId: employeeId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        amount: true,
        date: true,
        note: true,
        createdAt: true,
        sourceAccount: { select: { id: true, name: true } },
        sentBy: { select: { id: true, name: true } },
      },
    }),
    prisma.ledgerTransaction.findMany({
      where: { createdById: employeeId, type: 'EXPENSE' },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        amount: true,
        date: true,
        description: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
    }),
    getEmployeeBalance(employeeId),
  ])

  const byClient = new Map<
    string,
    { clientId: string; clientName: string; amount: Decimal; count: number }
  >()

  for (const tx of expenses) {
    const key = tx.client.id
    const existing = byClient.get(key)

    if (existing) {
      existing.amount = existing.amount.add(tx.amount)
      existing.count += 1
    } else {
      byClient.set(key, {
        clientId: tx.client.id,
        clientName: tx.client.name,
        amount: new Decimal(tx.amount),
        count: 1,
      })
    }
  }

  const clientBreakdown = Array.from(byClient.values()).sort((a, b) =>
    b.amount.cmp(a.amount),
  )

  return { user, transfers, expenses, balance, clientBreakdown }
}

// -----------------------------------------------------------------------------
// Source Account CRUD (ADMIN only)
// -----------------------------------------------------------------------------

export async function listSourceAccounts(includeInactive = false) {
  await requireRole('ADMIN')
  const where = includeInactive ? {} : { isActive: true }
  return prisma.sourceAccount.findMany({
    where,
    orderBy: { name: 'asc' },
  })
}

export async function createSourceAccount(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireRole('ADMIN')

  const parsed = sourceAccountSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const account = await prisma.sourceAccount.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      isActive: true,
    },
  })

  revalidatePath('/admin/accounts')
  return { success: true, data: { id: account.id } }
}

export async function updateSourceAccount(
  id: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireRole('ADMIN')

  const parsed = sourceAccountSchema.partial().safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  await prisma.sourceAccount.update({
    where: { id },
    data: parsed.data,
  })

  revalidatePath('/admin/accounts')
  return { success: true, data: { id } }
}

export async function toggleSourceAccount(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireRole('ADMIN')

  const account = await prisma.sourceAccount.findUnique({ where: { id }, select: { isActive: true } })
  if (!account) return { success: false, error: 'Hesap bulunamadı.' }

  await prisma.sourceAccount.update({
    where: { id },
    data: { isActive: !account.isActive },
  })

  revalidatePath('/admin/accounts')
  return { success: true, data: { id } }
}

export async function deactivateSourceAccount(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireRole('ADMIN')

  await prisma.sourceAccount.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath('/admin/accounts')
  return { success: true, data: { id } }
}

export async function deleteSourceAccount(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireRole('ADMIN')

  const usageCount = await prisma.employeeAdvanceTransfer.count({
    where: { sourceAccountId: id },
  })

  if (usageCount > 0) {
    return deactivateSourceAccount(id)
  }

  await prisma.sourceAccount.delete({ where: { id } })
  revalidatePath('/admin/accounts')

  return { success: true, data: { id } }
}