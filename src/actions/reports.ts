"use server"

import { prisma } from "@/lib/prisma"
import { requireCurrentUser } from "@/lib/current-user"

async function assertAdmin() {
  const user = await requireCurrentUser()
  if (user.role !== "ADMIN") throw new Error("UNAUTHORIZED")
}

export interface ExpenseReportFilters {
  from?: string
  to?: string
  clientId?: string
  projectId?: string
  userId?: string
}

export interface UserBreakdown {
  userId: string
  userName: string
  total: number
  count: number
}

export interface ClientBreakdown {
  clientId: string
  clientName: string
  total: number
  count: number
}

export interface ProjectBreakdown {
  projectId: string | null
  projectTitle: string
  total: number
  count: number
}

export interface RawTransaction {
  id: string
  date: Date
  amount: number
  description: string | null
  category: string | null
  status: string | null
  user: { id: string; name: string }
  client: { id: string; name: string }
  project: { id: string; fileNo: string; title: string } | null
}

export interface ExpenseReportResult {
  totals: {
    total: number
    approvedTotal: number
    count: number
  }
  groupedByUser: UserBreakdown[]
  groupedByClient: ClientBreakdown[]
  groupedByProject: ProjectBreakdown[]
  rawTransactions: RawTransaction[]
}

export async function getExpenseReport(
  filters: ExpenseReportFilters
): Promise<ExpenseReportResult> {
  await assertAdmin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { type: "EXPENSE" }

  if (filters.from || filters.to) {
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (filters.from) dateFilter.gte = new Date(filters.from)
    if (filters.to) dateFilter.lte = new Date(filters.to)
    where.date = dateFilter
  }

  if (filters.clientId) where.clientId = filters.clientId
  if (filters.projectId) where.projectId = filters.projectId
  if (filters.userId) where.createdById = filters.userId

  const txs = await prisma.ledgerTransaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      date: true,
      amount: true,
      description: true,
      category: true,
      status: true,
      createdBy: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      project: { select: { id: true, fileNo: true, title: true } },
    },
  })

  const rawTransactions: RawTransaction[] = txs.map((tx) => ({
    id: tx.id,
    date: tx.date,
    amount: Number(tx.amount),
    description: tx.description,
    category: tx.category,
    status: tx.status,
    user: tx.createdBy,
    client: tx.client,
    project: tx.project,
  }))

  const total = rawTransactions.reduce((s, tx) => s + tx.amount, 0)
  const approvedTotal = rawTransactions
    .filter((tx) => (tx.status ?? "APPROVED") === "APPROVED")
    .reduce((s, tx) => s + tx.amount, 0)

  const userMap = new Map<string, UserBreakdown>()
  const clientMap = new Map<string, ClientBreakdown>()
  const projectMap = new Map<string, ProjectBreakdown>()

  for (const tx of rawTransactions) {
    const u = userMap.get(tx.user.id) ?? {
      userId: tx.user.id,
      userName: tx.user.name,
      total: 0,
      count: 0,
    }
    u.total += tx.amount
    u.count++
    userMap.set(tx.user.id, u)

    const c = clientMap.get(tx.client.id) ?? {
      clientId: tx.client.id,
      clientName: tx.client.name,
      total: 0,
      count: 0,
    }
    c.total += tx.amount
    c.count++
    clientMap.set(tx.client.id, c)

    const pKey = tx.project?.id ?? "__none__"
    const pTitle = tx.project
      ? `${tx.project.fileNo} — ${tx.project.title}`
      : "Proje Belirtilmemiş"
    const p = projectMap.get(pKey) ?? {
      projectId: tx.project?.id ?? null,
      projectTitle: pTitle,
      total: 0,
      count: 0,
    }
    p.total += tx.amount
    p.count++
    projectMap.set(pKey, p)
  }

  return {
    totals: { total, approvedTotal, count: rawTransactions.length },
    groupedByUser: Array.from(userMap.values()).sort((a, b) => b.total - a.total),
    groupedByClient: Array.from(clientMap.values()).sort((a, b) => b.total - a.total),
    groupedByProject: Array.from(projectMap.values()).sort((a, b) => b.total - a.total),
    rawTransactions,
  }
}

export interface ReportFilterOptions {
  clients: Array<{ id: string; name: string }>
  projects: Array<{ id: string; fileNo: string; title: string; clientId: string }>
  users: Array<{ id: string; name: string }>
}

export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  await assertAdmin()

  const [clients, projects, users] = await Promise.all([
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      select: { id: true, fileNo: true, title: true, clientId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return { clients, projects, users }
}
