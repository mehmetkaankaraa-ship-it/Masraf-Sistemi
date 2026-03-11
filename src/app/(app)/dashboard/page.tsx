// src/app/(app)/dashboard/page.tsx
import { requireCurrentUser } from '@/lib/current-user'
import { getMyRecentExpenses, getMyRecentTransfers, getAllEmployeeSummaries } from '@/actions/advances'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Decimal } from '@prisma/client/runtime/library'
import {
  Receipt, FileText, ChevronRight, Banknote, Users,
  ArrowUpRight, ArrowDownLeft, LayoutGrid, Wallet, Clock, CheckCircle,
} from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { RightPanel } from '@/components/layout/RightPanel'
import { UserAdvanceBalanceCard } from '@/components/dashboard/UserAdvanceBalanceCard'
import { Suspense } from 'react'

function onlineStatus(lastActiveAt: Date | null) {
  if (!lastActiveAt) return 'offline'
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  if (diff < 2 * 60 * 1000) return 'online'
  if (diff < 10 * 60 * 1000) return 'recent'
  return 'offline'
}

function fmt(v: Decimal | number) {
  const n = v instanceof Decimal ? v.toNumber() : Number(v)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const me = await requireCurrentUser()
  return (
    <DashboardShell isAdmin={me.role === 'ADMIN'}>
      {me.role === 'ADMIN' ? <AdminContent /> : <UserContent />}
    </DashboardShell>
  )
}

// ─── Admin Content ────────────────────────────────────────────────────────────

async function AdminContent() {
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000)
  const [
    summaries,
    totalAdvanceAgg,
    totalExpenseAgg,
    clientCount,
    projectCount,
    recentTransactions,
    pendingExpenses,
    onlineUsers,
  ] = await Promise.all([
    getAllEmployeeSummaries(),
    prisma.employeeAdvanceTransfer.aggregate({ _sum: { amount: true } }),
    prisma.ledgerTransaction.aggregate({ where: { type: 'EXPENSE' }, _sum: { amount: true } }),
    prisma.client.count(),
    prisma.project.count(),
    prisma.ledgerTransaction.findMany({
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      include: {
        client:    { select: { id: true, name: true } },
        project:   { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.ledgerTransaction.findMany({
      where: { type: 'EXPENSE', status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      take: 5,
      include: {
        client:    { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { lastActiveAt: { gte: tenMinsAgo } },
      select: { id: true, name: true, role: true, lastActiveAt: true },
      orderBy: { lastActiveAt: 'desc' },
    }),
  ])

  const staffSummaries = summaries.filter((s) => s.role !== 'ADMIN')
  const totalAdvances = totalAdvanceAgg._sum.amount ?? new Decimal(0)
  const totalExpenses = totalExpenseAgg._sum.amount ?? new Decimal(0)
  const net = new Decimal(totalAdvances).sub(new Decimal(totalExpenses))

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Avans"
          value={fmt(totalAdvances)}
          icon={<ArrowUpRight className="h-4 w-4 text-violet-500" />}
          iconBg="bg-violet-50"
          valueColor="text-violet-700"
        />
        <StatCard
          label="Toplam Harcama"
          value={fmt(totalExpenses)}
          icon={<Receipt className="h-4 w-4 text-orange-500" />}
          iconBg="bg-orange-50"
          valueColor="text-orange-700"
        />
        <StatCard
          label="Net Bakiye"
          value={fmt(net)}
          icon={<Wallet className="h-4 w-4 text-emerald-500" />}
          iconBg="bg-emerald-50"
          valueColor={net.toNumber() >= 0 ? 'text-emerald-700' : 'text-red-600'}
        />
        <div className="grid grid-cols-2 gap-4 col-span-2 md:col-span-1">
          <StatCard
            label="Müvekkil"
            value={String(clientCount)}
            icon={<Users className="h-4 w-4 text-blue-500" />}
            iconBg="bg-blue-50"
            valueColor="text-blue-700"
            compact
          />
          <StatCard
            label="Proje"
            value={String(projectCount)}
            icon={<LayoutGrid className="h-4 w-4 text-indigo-500" />}
            iconBg="bg-indigo-50"
            valueColor="text-indigo-700"
            compact
          />
        </div>
      </div>

      {/* Pending Approvals + Online Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pending approvals */}
        <div className="bg-white rounded-xl border card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h2 className="text-[13px] font-semibold text-foreground">Onay Bekleyen Giderler</h2>
              {pendingExpenses.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                  {pendingExpenses.length}
                </span>
              )}
            </div>
            <Link href="/expenses?status=SUBMITTED" className="inline-flex items-center gap-0.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Tümü <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {pendingExpenses.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              Onay bekleyen gider yok.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {pendingExpenses.map((tx) => (
                <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-muted/10 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{tx.client.name}</p>
                    <p className="text-[11px] text-muted-foreground">{(tx as any).createdBy?.name ?? '—'} · {fmtDate(tx.submittedAt ?? tx.createdAt)}</p>
                  </div>
                  <span className="text-[13px] font-semibold text-orange-600 tabular-nums shrink-0">-{fmt(tx.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Online users */}
        <div className="bg-white rounded-xl border card-shadow overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <Users className="h-4 w-4 text-emerald-500" />
            <h2 className="text-[13px] font-semibold text-foreground">Çevrimiçi Kullanıcılar</h2>
            {onlineUsers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                {onlineUsers.length}
              </span>
            )}
          </div>
          {onlineUsers.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-muted-foreground">Şu an çevrimiçi kullanıcı yok.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {onlineUsers.map((u) => {
                const status = onlineStatus((u as any).lastActiveAt ?? null)
                return (
                  <div key={u.id} className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-muted/10 transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-foreground truncate">{u.name}</p>
                    </div>
                    <span className={`text-[10px] font-medium shrink-0 ${status === 'online' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {status === 'online' ? 'Çevrimiçi' : 'Son zamanlarda'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">

        {/* Left: tables */}
        <div className="space-y-6">

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border card-shadow overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">Son İşlemler</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">En güncel 10 kayıt</p>
              </div>
              <Link
                href="/clients"
                className="inline-flex items-center gap-0.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Tümünü gör <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/20">
                    {['Tarih', 'Müvekkil', 'Proje', 'Tür', 'Tutar', 'Ekleyen'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${i === 4 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                        Henüz işlem yok.
                      </td>
                    </tr>
                  ) : recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-muted-foreground">
                        {fmtDate(tx.date)}
                      </td>
                      <td className="px-4 py-3 max-w-[140px]">
                        <Link
                          href={`/clients/${tx.client.id}`}
                          className="text-[12px] font-medium text-foreground hover:text-primary transition-colors truncate block"
                        >
                          {tx.client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[120px]">
                        {tx.project ? (
                          <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md truncate block">
                            {tx.project.title}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={tx.type} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[13px] font-semibold tabular-nums ${tx.type === 'ADVANCE' ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {tx.type === 'ADVANCE' ? '+' : '-'}{fmt(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-muted-foreground">
                        {(tx as any).createdBy?.name ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employee Advance Summary */}
          {staffSummaries.length > 0 && (
            <div className="bg-white rounded-xl border card-shadow overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-[13px] font-semibold text-foreground">Çalışan Avans Özeti</h2>
                </div>
                <Link
                  href="/admin/users"
                  className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Detay <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      {['Çalışan', 'Alınan Avans', 'Harcama', 'Kalan Bakiye'].map((h, i) => (
                        <th
                          key={h}
                          className={`px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide ${i > 0 ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {staffSummaries.map((s) => {
                      const rem = s.remaining.toNumber()
                      return (
                        <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/admin/users/${s.id}`} className="text-[13px] font-medium text-foreground hover:text-primary transition-colors">
                              {s.name}
                            </Link>
                            <p className="text-[11px] text-muted-foreground">{s.email}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-[12px] font-medium text-violet-600 tabular-nums">
                            {fmt(s.totalTransferred)}
                          </td>
                          <td className="px-4 py-3 text-right text-[12px] font-medium text-orange-600 tabular-nums">
                            {fmt(s.totalExpenses)}
                          </td>
                          <td className={`px-4 py-3 text-right text-[13px] font-bold tabular-nums ${rem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmt(s.remaining)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Right Panel */}
        <Suspense fallback={<div className="bg-white rounded-xl border card-shadow h-60 animate-pulse" />}>
          <RightPanel />
        </Suspense>

      </div>
    </div>
  )
}

// ─── User Content ─────────────────────────────────────────────────────────────

async function UserContent() {
  const [recentExpenses, recentTransfers] = await Promise.all([
    getMyRecentExpenses(8),
    getMyRecentTransfers(5),
  ])

  return (
    <div className="space-y-6">

      {/* Advance Balance Card */}
      <UserAdvanceBalanceCard />

      {/* Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

        {/* Recent Expenses */}
        <div className="bg-white rounded-xl border card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-foreground">Son Harcamalarım</h2>
            </div>
            <Link
              href="/clients"
              className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Tümünü gör <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-7 w-7 text-muted-foreground/25 mx-auto mb-2.5" />
              <p className="text-[13px] text-muted-foreground">Henüz harcama yok.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentExpenses.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/clients/${tx.client.id}`} className="text-[12px] font-medium text-foreground hover:text-primary transition-colors truncate">
                        {tx.client.name}
                      </Link>
                      {tx.project && (
                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
                          {tx.project.title}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {fmtDate(tx.date)}{tx.description ? ` · ${tx.description}` : ''}
                    </p>
                  </div>
                  <span className="text-[13px] font-semibold text-orange-600 tabular-nums shrink-0 ml-3">
                    -{fmt(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transfers */}
        <div className="bg-white rounded-xl border card-shadow overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-foreground">Son Alınan Avanslar</h2>
          </div>

          {recentTransfers.length === 0 ? (
            <div className="py-12 text-center">
              <Banknote className="h-7 w-7 text-muted-foreground/25 mx-auto mb-2.5" />
              <p className="text-[13px] text-muted-foreground">Henüz avans alınmadı.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentTransfers.map((t) => (
                <div key={t.id} className="px-5 py-3 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">
                        {t.sourceAccount?.name ?? 'Bilinmiyor'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {fmtDate(t.date)} · {t.sentBy.name}
                      </p>
                      {t.note && (
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5 italic truncate">{t.note}</p>
                      )}
                    </div>
                    <span className="text-[13px] font-semibold text-emerald-600 tabular-nums shrink-0">
                      +{fmt(t.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  iconBg,
  valueColor,
  compact = false,
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  valueColor: string
  compact?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border card-shadow px-5 py-4 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        <p className={`font-bold tabular-nums tracking-tight truncate ${compact ? 'text-xl' : 'text-2xl'} ${valueColor}`}>
          {value}
        </p>
      </div>
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  if (type === 'ADVANCE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
        <ArrowDownLeft className="h-2.5 w-2.5" />
        Avans
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-100">
      <Receipt className="h-2.5 w-2.5" />
      Harcama
    </span>
  )
}
