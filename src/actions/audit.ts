// src/actions/audit.ts
'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export async function getAuditLogs(filters?: {
  userId?: string
  entityType?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}) {
  await requireRole('ADMIN')

  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 50

  const where: any = {}
  if (filters?.userId) where.performedById = filters.userId
  if (filters?.entityType) where.entityType = filters.entityType
  if (filters?.dateFrom || filters?.dateTo) {
    where.timestamp = {}
    if (filters.dateFrom) where.timestamp.gte = new Date(filters.dateFrom)
    if (filters.dateTo) where.timestamp.lte = new Date(filters.dateTo)
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        performedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total }
}
