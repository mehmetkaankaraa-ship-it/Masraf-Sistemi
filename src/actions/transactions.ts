// src/actions/transactions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { advanceSchema, expenseSchema, refundSchema, ledgerFilterSchema, updateTransactionSchema } from '@/lib/schemas'
import { Decimal } from '@prisma/client/runtime/library'
import type { ActionResult } from './clients'
import type { Prisma, TransactionType } from '@prisma/client'
import { del } from '@vercel/blob'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/actions/notifications'

// Look up the real DB user by email (always present in session).
// session.user.id is unreliable in NextAuth v5 server actions and can be undefined,
// which causes the FK violation on LedgerTransaction_createdById_fkey.
async function getDbUser() {
  const session = await requireSession()
  const email = session.user.email
  if (!email) throw new Error('Session email missing. Please log in again.')
  const dbUser = await prisma.user.findUnique({ where: { email } })
  if (!dbUser) throw new Error('Session user not found in database. Please log in again.')
  return dbUser
}

async function resolveClientAccess(clientId: string) {
  let dbUser: Awaited<ReturnType<typeof getDbUser>>
  try {
    dbUser = await getDbUser()
  } catch (e: any) {
    return { error: e.message as string } as const
  }

  const isAdmin = dbUser.role === 'ADMIN'

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) return { error: 'Muvekkil bulunamadi.' } as const

  return { dbUser, isAdmin } as const
}

// Create ADVANCE (IN)
export async function createAdvance(
  data: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  const access = await resolveClientAccess(String((data as any).clientId ?? ''))
  if ('error' in access) return { success: false, error: access.error ?? "Access error" }
  const { dbUser } = access

  const parsed = advanceSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { clientId, amount, date, description } = parsed.data

  const tx = await prisma.ledgerTransaction.create({
    data: {
      type: 'ADVANCE',
      amount: new Decimal(amount),
      currency: 'TRY',
      date: new Date(date),
      description: description ?? null,
      clientId,
      projectId: null,
      createdById: dbUser.id,
    },
  })

  await logAudit({ entityType: 'TRANSACTION', entityId: tx.id, actionType: 'CREATE', newValues: { type: 'ADVANCE', amount, date, clientId }, performedById: dbUser.id })
  revalidatePath(`/clients/${clientId}`)
  return { success: true, data: { id: tx.id } }
}

// Create EXPENSE (OUT)
export async function createExpense(
  data: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  const access = await resolveClientAccess(String((data as any).clientId ?? ''))
  if ('error' in access) return { success: false, error: access.error ?? 'Access error' }
  const { dbUser } = access

  const parsed = expenseSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const {
    clientId,
    projectId,
    amount,
    date,
    description,
    category,
    paymentMethod,
    vatIncluded,
    vatRate,
    invoiceNo,
    invoiced,
    attachmentMeta,
  } = parsed.data as any

  const tx = await prisma.ledgerTransaction.create({
    data: {
      type: 'EXPENSE',
      amount: new Decimal(amount),
      currency: 'TRY',
      date: new Date(date),
      description: description ?? null,
      category: category ?? null,
      paymentMethod: paymentMethod ?? null,
      vatIncluded,
      vatRate,
      invoiceNo: invoiceNo || null,
      invoiced,
      forceNegative: false,
      status: 'DRAFT',
      approvedAt: null,
      approvedById: null,
      clientId,
      projectId: projectId || null,
      createdById: dbUser.id,
      attachments: attachmentMeta?.length
        ? { create: attachmentMeta.map((m: any) => ({ ...m })) }
        : undefined,
    },
  })

  await logAudit({ entityType: 'TRANSACTION', entityId: tx.id, actionType: 'CREATE', newValues: { type: 'EXPENSE', amount, date, clientId, projectId }, performedById: dbUser.id })
  revalidatePath(`/clients/${clientId}`)
  if (projectId) revalidatePath(`/projects/${projectId}`)
  return { success: true, data: { id: tx.id } }
}

// Create REFUND (OUT)
export async function createRefund(
  data: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  const access = await resolveClientAccess(String((data as any).clientId ?? ''))
  if ('error' in access) return { success: false, error: access.error ?? 'Access error' }
  const { dbUser } = access

  const parsed = refundSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { clientId, amount, date, description } = parsed.data as any

  const tx = await prisma.ledgerTransaction.create({
    data: {
      type: 'REFUND',
      amount: new Decimal(amount),
      currency: 'TRY',
      date: new Date(date),
      description: description ?? null,
      forceNegative: false,
      clientId,
      projectId: null,
      createdById: dbUser.id,
    },
  })

  await logAudit({ entityType: 'TRANSACTION', entityId: tx.id, actionType: 'CREATE', newValues: { type: 'REFUND', amount, date, clientId }, performedById: dbUser.id })
  revalidatePath(`/clients/${clientId}`)
  return { success: true, data: { id: tx.id } }
}

// Create USER_TRANSFER (admin gives money to employee)
export async function createUserTransfer(data: {
  receivedById: string
  amount: number
  date: string
  description?: string
  clientId: string
}): Promise<ActionResult<{ id: string }>> {
  let dbUser: Awaited<ReturnType<typeof getDbUser>>
  try {
    dbUser = await getDbUser()
  } catch (e: any) {
    return { success: false, error: e.message }
  }

  if (dbUser.role !== 'ADMIN') {
    return { success: false, error: 'Bu islem icin admin yetkisi gereklidir.' }
  }

  const receiver = await prisma.user.findUnique({ where: { id: data.receivedById } })
  if (!receiver) return { success: false, error: 'Alici kullanici bulunamadi.' }

  const client = await prisma.client.findUnique({ where: { id: data.clientId } })
  if (!client) return { success: false, error: 'Muvekkil bulunamadi.' }

  const tx = await prisma.ledgerTransaction.create({
    data: {
      type: 'USER_TRANSFER',
      amount: new Decimal(data.amount),
      currency: 'TRY',
      date: new Date(data.date),
      description: data.description ?? null,
      clientId: data.clientId,
      projectId: null,
      createdById: dbUser.id,
      receivedById: data.receivedById,
    },
  })

  await logAudit({ entityType: 'TRANSACTION', entityId: tx.id, actionType: 'CREATE', newValues: { type: 'USER_TRANSFER', ...data }, performedById: dbUser.id })
  revalidatePath(`/admin/users/${data.receivedById}`)
  revalidatePath(`/clients/${data.clientId}`)
  return { success: true, data: { id: tx.id } }
}

// List / filter transactions
export async function listTransactions(
  input: Record<string, unknown>,
): Promise<{ transactions: any[]; total: number }> {
  let dbUser: Awaited<ReturnType<typeof getDbUser>>
  try {
    dbUser = await getDbUser()
  } catch {
    return { transactions: [], total: 0 }
  }

  const isAdmin = dbUser.role === 'ADMIN'

  const parsed = ledgerFilterSchema.safeParse(input)
  if (!parsed.success) return { transactions: [], total: 0 }

  const {
    clientId,
    projectId,
    type,
    dateFrom,
    dateTo,
    search,
    createdById,
    page,
    pageSize,
  } = parsed.data as any

  const where: Prisma.LedgerTransactionWhereInput = {}

  if (clientId) where.clientId = clientId
  if (projectId) where.projectId = projectId
  if (type) where.type = type as TransactionType

  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) (where.date as any).gte = new Date(dateFrom)
    if (dateTo) (where.date as any).lte = new Date(dateTo)
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { invoiceNo: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (isAdmin && createdById) where.createdById = createdById

  const skip = (page - 1) * pageSize

  const [transactions, total] = await Promise.all([
    prisma.ledgerTransaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, fileNo: true, title: true } },
        attachments: true,
      },
    }),
    prisma.ledgerTransaction.count({ where }),
  ])

  return { transactions, total }
}

// Backwards-compatible alias
export async function getTransactionsByClient(clientId: string) {
  return listTransactions({ clientId, page: 1, pageSize: 50 } as any)
}

// Update transaction
export async function updateTransaction(
  data: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateTransactionSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { id, clientId } = parsed.data

  const access = await resolveClientAccess(clientId)
  if ('error' in access) return { success: false, error: access.error ?? 'Access error' }
  const { dbUser, isAdmin } = access

  const existing = await prisma.ledgerTransaction.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      clientId: true,
      projectId: true,
      createdById: true,
    },
  })

  if (!existing) return { success: false, error: 'Kayit bulunamadi.' }
  if (existing.clientId !== clientId) return { success: false, error: 'Gecersiz muvekkil.' }

  if (!isAdmin && existing.createdById !== dbUser.id) {
    return { success: false, error: 'Sadece kendi olusturdugunuz kayitlari duzenleyebilirsiniz.' }
  }

  const {
    amount,
    date,
    description,
    projectId,
    category,
    paymentMethod,
    vatIncluded,
    vatRate,
    invoiceNo,
    invoiced,
    attachmentMeta,
  } = parsed.data as any

  if (existing.type === 'EXPENSE') {
    if (!projectId) return { success: false, error: 'Harcama icin proje secmek zorunlu.' }
  }

  const nextProjectId =
    existing.type === 'EXPENSE'
      ? (projectId || null)
      : null

  await prisma.ledgerTransaction.update({
    where: { id },
    data: {
      amount: new Decimal(amount),
      date: new Date(date),
      description: description ?? null,
      projectId: nextProjectId,
      category: existing.type === 'EXPENSE' ? (category ?? null) : null,
      paymentMethod: existing.type === 'EXPENSE' ? (paymentMethod ?? null) : null,
      vatIncluded: existing.type === 'EXPENSE' ? !!vatIncluded : null,
      vatRate: existing.type === 'EXPENSE' ? (Number(vatRate) || 0) : null,
      invoiceNo: existing.type === 'EXPENSE' ? (invoiceNo || null) : null,
      invoiced: existing.type === 'EXPENSE' ? !!invoiced : null,
      attachments: attachmentMeta?.length
        ? { create: attachmentMeta.map((m: any) => ({ ...m })) }
        : undefined,
    },
  })

  revalidatePath(`/clients/${clientId}`)
  if (existing.projectId) revalidatePath(`/projects/${existing.projectId}`)
  if (nextProjectId) revalidatePath(`/projects/${nextProjectId}`)

  await logAudit({ entityType: 'TRANSACTION', entityId: id, actionType: 'UPDATE', oldValues: existing, newValues: { amount, date, description, projectId: nextProjectId }, performedById: dbUser.id })
  return { success: true, data: { id } }
}

// Delete a transaction (ADMIN only)
export async function deleteTransaction(
  transactionId: string,
): Promise<ActionResult<{ id: string }>> {
  let dbUser: Awaited<ReturnType<typeof getDbUser>>
  try {
    dbUser = await getDbUser()
  } catch (e: any) {
    return { success: false, error: e.message }
  }

  if (dbUser.role !== 'ADMIN') {
    return { success: false, error: 'Bu islem icin yetkiniz yok.' }
  }

  const tx = await prisma.ledgerTransaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      clientId: true,
      projectId: true,
      attachments: { select: { storageKey: true } },
    },
  })

  if (!tx) return { success: false, error: 'Kayit bulunamadi.' }

  await prisma.ledgerTransaction.delete({ where: { id: transactionId } })

  // Delete blob files (storageKey is a full https:// URL for Vercel Blob)
  const blobUrls = tx.attachments
    .map((a) => a.storageKey)
    .filter((k) => k.startsWith('http'))
  if (blobUrls.length > 0) {
    try { await del(blobUrls) } catch {}
  }

  revalidatePath(`/clients/${tx.clientId}`)
  if (tx.projectId) revalidatePath(`/projects/${tx.projectId}`)
  await logAudit({ entityType: 'TRANSACTION', entityId: tx.id, actionType: 'DELETE', oldValues: tx, performedById: dbUser.id })
  return { success: true, data: { id: tx.id } }
}

// Submit expense for approval (creator only, DRAFT → SUBMITTED)
export async function submitExpense(id: string): Promise<ActionResult<{ id: string }>> {
  let dbUser: Awaited<ReturnType<typeof getDbUser>>
  try { dbUser = await getDbUser() } catch (e: any) { return { success: false, error: e.message } }

  const tx = await prisma.ledgerTransaction.findUnique({
    where: { id },
    select: { id: true, type: true, status: true, createdById: true, clientId: true },
  })
  if (!tx) return { success: false, error: 'Kayıt bulunamadı.' }
  if (tx.type !== 'EXPENSE') return { success: false, error: 'Sadece giderler onaya gönderilebilir.' }
  if (tx.createdById !== dbUser.id) return { success: false, error: 'Yalnızca kendi giderinizi onaya gönderebilirsiniz.' }
  if (tx.status !== 'DRAFT') return { success: false, error: 'Yalnızca taslak giderler onaya gönderilebilir.' }

  await prisma.ledgerTransaction.update({
    where: { id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  // Notify all admins
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } })
  await Promise.all(
    admins.map((a) =>
      createNotification(a.id, 'Onay Bekleyen Gider', `${dbUser.name} yeni bir gider onaya gönderdi.`)
    )
  )

  await logAudit({ entityType: 'TRANSACTION', entityId: id, actionType: 'UPDATE', oldValues: { status: 'DRAFT' }, newValues: { status: 'SUBMITTED' }, performedById: dbUser.id })
  revalidatePath('/expenses')
  revalidatePath(`/clients/${tx.clientId}`)
  return { success: true, data: { id } }
}

// Approve expense (ADMIN only, SUBMITTED → APPROVED)
export async function approveExpense(id: string): Promise<ActionResult<{ id: string }>> {
  let dbUser: Awaited<ReturnType<typeof getDbUser>>
  try { dbUser = await getDbUser() } catch (e: any) { return { success: false, error: e.message } }
  if (dbUser.role !== 'ADMIN') return { success: false, error: 'Bu işlem için yetkiniz yok.' }

  const tx = await prisma.ledgerTransaction.findUnique({
    where: { id },
    select: { id: true, type: true, status: true, clientId: true, createdById: true },
  })
  if (!tx) return { success: false, error: 'Kayıt bulunamadı.' }
  if (tx.type !== 'EXPENSE') return { success: false, error: 'Sadece giderler onaylanabilir.' }
  if (tx.status !== 'SUBMITTED') return { success: false, error: 'Yalnızca onay bekleyen giderler onaylanabilir.' }

  await prisma.ledgerTransaction.update({
    where: { id },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedById: dbUser.id },
  })

  await createNotification(tx.createdById, 'Gideriniz Onaylandı', `${dbUser.name} tarafından onaylandı.`)

  await logAudit({ entityType: 'TRANSACTION', entityId: id, actionType: 'UPDATE', oldValues: { status: 'SUBMITTED' }, newValues: { status: 'APPROVED', approvedById: dbUser.id }, performedById: dbUser.id })
  revalidatePath('/expenses')
  revalidatePath(`/clients/${tx.clientId}`)
  return { success: true, data: { id } }
}

// Reject expense (ADMIN only, SUBMITTED → REJECTED)
export async function rejectExpense(id: string, reason: string): Promise<ActionResult<{ id: string }>> {
  let dbUser: Awaited<ReturnType<typeof getDbUser>>
  try { dbUser = await getDbUser() } catch (e: any) { return { success: false, error: e.message } }
  if (dbUser.role !== 'ADMIN') return { success: false, error: 'Bu işlem için yetkiniz yok.' }

  const tx = await prisma.ledgerTransaction.findUnique({
    where: { id },
    select: { id: true, type: true, status: true, clientId: true, createdById: true },
  })
  if (!tx) return { success: false, error: 'Kayıt bulunamadı.' }
  if (tx.type !== 'EXPENSE') return { success: false, error: 'Sadece giderler reddedilebilir.' }
  if (tx.status !== 'SUBMITTED') return { success: false, error: 'Yalnızca onay bekleyen giderler reddedilebilir.' }

  await prisma.ledgerTransaction.update({
    where: { id },
    data: { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: reason || null },
  })

  await createNotification(
    tx.createdById,
    'Gideriniz Reddedildi',
    reason ? `${dbUser.name}: ${reason}` : `${dbUser.name} tarafından reddedildi.`
  )

  await logAudit({ entityType: 'TRANSACTION', entityId: id, actionType: 'UPDATE', oldValues: { status: 'SUBMITTED' }, newValues: { status: 'REJECTED', rejectedReason: reason }, performedById: dbUser.id })
  revalidatePath('/expenses')
  revalidatePath(`/clients/${tx.clientId}`)
  return { success: true, data: { id } }
}

// Delete an attachment
export async function deleteAttachment(
  attachmentId: string,
): Promise<ActionResult<{ id: string }>> {
  let dbUser: Awaited<ReturnType<typeof getDbUser>>
  try {
    dbUser = await getDbUser()
  } catch (e: any) {
    return { success: false, error: e.message }
  }

  const isAdmin = dbUser.role === 'ADMIN'

  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      storageKey: true,
      transaction: { select: { clientId: true, projectId: true, createdById: true } },
    },
  })

  if (!att) return { success: false, error: 'Belge bulunamadi.' }

  if (!isAdmin && att.transaction.createdById !== dbUser.id) {
    return { success: false, error: 'Sadece kendi eklediginiz harcama belgesini silebilirsiniz.' }
  }

  await prisma.attachment.delete({ where: { id: attachmentId } })

  // Delete blob file (storageKey is a full https:// URL for Vercel Blob)
  if (att.storageKey.startsWith('http')) {
    try { await del(att.storageKey) } catch {}
  }

  revalidatePath(`/clients/${att.transaction.clientId}`)
  if (att.transaction.projectId) revalidatePath(`/projects/${att.transaction.projectId}`)
  return { success: true, data: { id: att.id } }
}