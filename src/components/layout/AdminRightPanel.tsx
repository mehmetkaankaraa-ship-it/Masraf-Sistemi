// src/components/layout/AdminRightPanel.tsx
import { prisma } from '@/lib/prisma'
import { requireCurrentUser } from '@/lib/current-user'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, TrendingDown, ChevronRight, Users } from 'lucide-react'
import { Decimal } from '@prisma/client/runtime/library'
import { startOfMonth, endOfMonth } from 'date-fns'
import { getEmployeeBalance } from '@/actions/advances'

function formatTRY(v: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)
}

async function getCriticalBalances() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true, transactions: { select: { type: true, amount: true } } },
  })
  const withBal = clients.map(c => {
    let bal = new Decimal(0)
    for (const tx of c.transactions) {
      if (tx.type === 'ADVANCE') bal = bal.add(tx.amount)
      else bal = bal.sub(tx.amount)
    }
    return { id: c.id, name: c.name, balance: bal.toNumber() }
  })
  return withBal.filter(c => c.balance < 0).sort((a,b) => a.balance - b.balance).slice(0, 4)
}

async function getMonthlyOverview() {
  const now = new Date()
  const txs = await prisma.ledgerTransaction.findMany({
    where: { date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
    select: { type: true, amount: true },
  })
  let income = 0, expense = 0
  for (const tx of txs) {
    const amt = tx.amount instanceof Decimal ? tx.amount.toNumber() : Number(tx.amount)
    if (tx.type === 'ADVANCE') income += amt
    else expense += amt
  }
  const total = income + expense
  return { income, expense, incomePercent: total > 0 ? Math.round(income/total*100) : 0, expensePercent: total > 0 ? Math.round(expense/total*100) : 0 }
}

async function getEmployeeSummaries() {
  const employees = await prisma.user.findMany({ where: { role: 'USER' }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  const summaries = await Promise.all(
    employees.map(async e => {
      const { remaining } = await getEmployeeBalance(e.id)
      return { ...e, balance: remaining.toNumber() }
    })
  )
  return summaries.sort((a,b) => a.balance - b.balance).slice(0, 5)
}

export async function AdminRightPanel() {
  await requireCurrentUser()

  const [criticalClients, monthly, employees] = await Promise.all([
    getCriticalBalances(),
    getMonthlyOverview(),
    getEmployeeSummaries(),
  ])

  const monthName = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  return (
    <aside className="flex flex-col gap-4 h-full overflow-y-auto">

      {/* Employee Advance Balances */}
      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-violet-500" />
            <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">Çalışan Avans</h3>
          </div>
          <Link href="/admin/users" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Tümüne Bak</Link>
        </div>
        {employees.length === 0 ? (
          <div className="px-4 py-5 text-center"><p className="text-[12px] text-muted-foreground">Çalışan yok.</p></div>
        ) : (
          <div className="divide-y divide-border/60">
            {employees.map(e => (
              <Link key={e.id} href={`/admin/users/${e.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/15 transition-colors group">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-primary">{e.name.slice(0,1)}</span>
                  </div>
                  <span className="text-[12px] font-medium text-foreground truncate">{e.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={`text-[12px] font-semibold tabular-nums ${e.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatTRY(e.balance)}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Critical Client Balances */}
      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">Kritik Bakiyeler</h3>
          </div>
          <Link href="/clients" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Tumu</Link>
        </div>
        {criticalClients.length === 0 ? (
          <div className="px-4 py-5 text-center"><p className="text-[12px] text-muted-foreground">Negatif bakiyeli müvekkil yok.</p></div>
        ) : (
          <div className="divide-y divide-border/60">
            {criticalClients.map(c => (
              <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-rose-50/40 transition-colors group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  <span className="text-[12px] font-medium text-foreground truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[12px] font-semibold text-rose-600 tabular-nums">{formatTRY(c.balance)}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-rose-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Overview */}
      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide">Aylık Özet</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{monthName}</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /><span className="text-[12px] text-muted-foreground">Avans Giren</span></div>
              <span className="text-[12px] font-semibold text-emerald-600 tabular-nums">{formatTRY(monthly.income)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${monthly.incomePercent}%` }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-rose-500" /><span className="text-[12px] text-muted-foreground">Harcama / İade</span></div>
              <span className="text-[12px] font-semibold text-rose-600 tabular-nums">{formatTRY(monthly.expense)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-rose-400 rounded-full transition-all duration-500" style={{ width: `${monthly.expensePercent}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-[12px] font-medium text-muted-foreground">Net</span>
            <span className={`text-[13px] font-bold tabular-nums ${monthly.income - monthly.expense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatTRY(monthly.income - monthly.expense)}
            </span>
          </div>
        </div>
      </div>

    </aside>
  )
}
