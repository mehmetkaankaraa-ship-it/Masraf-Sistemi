// src/components/layout/RightPanel.tsx
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { Decimal } from '@prisma/client/runtime/library'
import { startOfMonth, endOfMonth } from 'date-fns'

function formatTRY(v: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)
}

async function getCriticalBalances() {
  // Get ALL clients (shared firm pool)
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      transactions: {
        select: { type: true, amount: true },
      },
    },
  })

  // Compute balance per client
  const withBalance = clients.map((c) => {
    let bal = new Decimal(0)
    for (const tx of c.transactions) {
      if (tx.type === 'ADVANCE') bal = bal.add(tx.amount)
      else bal = bal.sub(tx.amount)
    }
    return { id: c.id, name: c.name, balance: bal.toNumber() }
  })

  // Return worst 4 negative
  return withBalance
    .filter((c) => c.balance < 0)
    .sort((a, b) => a.balance - b.balance)
    .slice(0, 4)
}

async function getMonthlyOverview() {
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)

  const txs = await prisma.ledgerTransaction.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    select: { type: true, amount: true },
  })

  let income = 0
  let expense = 0

  for (const tx of txs) {
    const amt = typeof tx.amount === 'object' && 'toNumber' in tx.amount
      ? (tx.amount as Decimal).toNumber()
      : Number(tx.amount)
    if (tx.type === 'ADVANCE') income += amt
    else expense += amt
  }

  const total = income + expense
  const incomePercent = total > 0 ? Math.round((income / total) * 100) : 0
  const expensePercent = total > 0 ? Math.round((expense / total) * 100) : 0

  return { income, expense, incomePercent, expensePercent }
}

export async function RightPanel() {
  await requireSession()

  const [criticalClients, monthly] = await Promise.all([
    getCriticalBalances(),
    getMonthlyOverview(),
  ])

  const monthName = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  return (
    <aside className="flex flex-col gap-4 h-full overflow-y-auto">

      {/* ─── Critical Balances ─── */}
      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">
              Kritik Bakiyeler
            </h3>
          </div>
          <Link href="/clients" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            Tümü
          </Link>
        </div>

        {criticalClients.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-[12px] text-muted-foreground">Negatif bakiyeli müvekkil yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {criticalClients.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-rose-50/40 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  <span className="text-[12px] font-medium text-foreground truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[12px] font-semibold text-rose-600 tabular-nums">
                    {formatTRY(c.balance)}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-rose-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ─── Monthly Overview ─── */}
      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">
            Aylık Özet
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{monthName}</p>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Income row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[12px] text-muted-foreground">Avans Giren</span>
              </div>
              <span className="text-[12px] font-semibold text-emerald-600 tabular-nums">
                {formatTRY(monthly.income)}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${monthly.incomePercent}%` }}
              />
            </div>
          </div>

          {/* Expense row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-[12px] text-muted-foreground">Harcama / İade</span>
              </div>
              <span className="text-[12px] font-semibold text-rose-600 tabular-nums">
                {formatTRY(monthly.expense)}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-400 rounded-full transition-all duration-500"
                style={{ width: `${monthly.expensePercent}%` }}
              />
            </div>
          </div>

          {/* Net */}
          <div
            className="flex items-center justify-between pt-3 border-t"
          >
            <span className="text-[12px] font-medium text-muted-foreground">Net</span>
            <span
              className={`text-[13px] font-bold tabular-nums ${
                monthly.income - monthly.expense >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatTRY(monthly.income - monthly.expense)}
            </span>
          </div>
        </div>
      </div>

    </aside>
  )
}
