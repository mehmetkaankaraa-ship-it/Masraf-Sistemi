// src/app/(app)/ledger/page.tsx
import { requireCurrentUser } from '@/lib/current-user'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Decimal } from '@prisma/client/runtime/library'
import { BookOpen, ArrowDownLeft, Receipt } from 'lucide-react'

function fmt(v: Decimal | number) {
  const n = v instanceof Decimal ? v.toNumber() : Number(v)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function LedgerPage() {
  const me = await requireCurrentUser()

  const where = me.role === 'ADMIN' ? {} : { createdById: me.id }

  const [transactions, advanceAgg, expenseAgg] = await Promise.all([
    prisma.ledgerTransaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        client:    { select: { id: true, name: true } },
        project:   { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.ledgerTransaction.aggregate({ where: { ...where, type: 'ADVANCE' },  _sum: { amount: true } }),
    prisma.ledgerTransaction.aggregate({ where: { ...where, type: 'EXPENSE' }, _sum: { amount: true } }),
  ])

  const totalAdvance = advanceAgg._sum.amount ?? new Decimal(0)
  const totalExpense = expenseAgg._sum.amount ?? new Decimal(0)
  const net = new Decimal(totalAdvance).sub(new Decimal(totalExpense))

  return (
    <div className="space-y-5 max-w-[960px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Defter</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">{transactions.length} kayıt</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Toplam Avans',   value: fmt(totalAdvance), color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <ArrowDownLeft className="h-4 w-4 text-emerald-500" /> },
          { label: 'Toplam Harcama', value: fmt(totalExpense), color: 'text-orange-700',  bg: 'bg-orange-50',  icon: <Receipt className="h-4 w-4 text-orange-500" /> },
          { label: 'Net Bakiye',     value: fmt(net),          color: net.toNumber() >= 0 ? 'text-emerald-700' : 'text-red-600', bg: 'bg-muted/40', icon: <BookOpen className="h-4 w-4 text-muted-foreground" /> },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border card-shadow px-5 py-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>{c.icon}</div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</p>
              <p className={`text-[18px] font-bold tabular-nums mt-0.5 ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ledger table */}
      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-foreground">Tüm İşlemler</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="h-7 w-7 text-muted-foreground/25 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-foreground mb-1">Henüz işlem yok</p>
            <p className="text-[13px] text-muted-foreground">Harcama veya avans ekleyin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20">
                  {['Tarih', 'Müvekkil', 'Proje', 'Tür', 'Açıklama', me.role === 'ADMIN' ? 'Ekleyen' : '', 'Tutar'].filter(Boolean).map((h, i, arr) => (
                    <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${i === arr.length - 1 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] text-muted-foreground">{fmtDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${tx.client.id}`} className="text-[12px] font-medium text-foreground hover:text-primary transition-colors">
                        {tx.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {tx.project
                        ? <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">{tx.project.title}</span>
                        : <span className="text-[11px] text-muted-foreground/40">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {tx.type === 'ADVANCE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <ArrowDownLeft className="h-2.5 w-2.5" />Avans
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-100">
                          <Receipt className="h-2.5 w-2.5" />Harcama
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[160px] text-[11px] text-muted-foreground truncate">
                      {tx.description || '—'}
                    </td>
                    {me.role === 'ADMIN' && (
                      <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                        {(tx as any).createdBy?.name ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-[13px] font-semibold tabular-nums ${tx.type === 'ADVANCE' ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {tx.type === 'ADVANCE' ? '+' : '-'}{fmt(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
