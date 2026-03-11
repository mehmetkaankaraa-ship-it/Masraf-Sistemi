// src/app/(app)/expenses/page.tsx
import { requireCurrentUser } from '@/lib/current-user'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Decimal } from '@prisma/client/runtime/library'
import { Receipt, Clock } from 'lucide-react'
import { ExpenseActionButtons } from '@/components/expenses/ExpenseActionButtons'

function fmt(v: Decimal | number) {
  const n = v instanceof Decimal ? v.toNumber() : Number(v)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusConfig = {
  DRAFT:     { label: 'Taslak',       bg: 'bg-muted',        text: 'text-muted-foreground' },
  SUBMITTED: { label: 'Onay Bekliyor', bg: 'bg-amber-50',    text: 'text-amber-700' },
  APPROVED:  { label: 'Onaylandı',    bg: 'bg-emerald-50',   text: 'text-emerald-700' },
  REJECTED:  { label: 'Reddedildi',   bg: 'bg-red-50',       text: 'text-red-600' },
}

export default async function ExpensesPage() {
  const me = await requireCurrentUser()
  const isAdmin = me.role === 'ADMIN'

  const where = isAdmin
    ? { type: 'EXPENSE' as const }
    : { type: 'EXPENSE' as const, createdById: me.id }

  const [expenses, totalAgg, pendingCount] = await Promise.all([
    prisma.ledgerTransaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        client:    { select: { id: true, name: true } },
        project:   { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.ledgerTransaction.aggregate({ where, _sum: { amount: true } }),
    isAdmin
      ? prisma.ledgerTransaction.count({ where: { type: 'EXPENSE', status: 'SUBMITTED' } })
      : Promise.resolve(0),
  ])

  const total = totalAgg._sum.amount ?? new Decimal(0)

  const headers = ['Tarih', 'Müvekkil', 'Proje', 'Açıklama', isAdmin ? 'Ekleyen' : '', 'Durum', 'Tutar', ''].filter(Boolean)

  return (
    <div className="space-y-5 max-w-[1000px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Giderler</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {expenses.length} kayıt
            {isAdmin && pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
                <Clock className="h-2.5 w-2.5" />
                {pendingCount} onay bekliyor
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/expenses/report"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border text-[13px] font-medium rounded-xl hover:bg-muted/40 transition-colors"
          >
            Rapor / Excel
          </Link>
          <div className="bg-white rounded-xl border card-shadow px-4 py-2.5 text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Toplam</p>
            <p className="text-[16px] font-bold text-orange-600 tabular-nums">{fmt(total)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        {expenses.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-[14px] font-medium text-foreground mb-1">Henüz gider yok</p>
            <p className="text-[13px] text-muted-foreground">İlk giderinizi oluşturun.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20">
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${h === 'Tutar' ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {expenses.map((tx) => {
                  const statusKey = (tx.status ?? 'APPROVED') as keyof typeof statusConfig
                  const sc = statusConfig[statusKey] ?? statusConfig.APPROVED
                  const isOwner = tx.createdById === me.id
                  return (
                    <tr key={tx.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-muted-foreground">
                        {fmtDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/clients/${tx.client.id}`} className="text-[12px] font-medium text-foreground hover:text-primary transition-colors">
                          {tx.client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {tx.project ? (
                          <Link href={`/projects/${tx.project.id}`} className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md hover:text-primary transition-colors">
                            {tx.project.title}
                          </Link>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <span className="text-[12px] text-muted-foreground truncate block">
                          {tx.description || '—'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-muted-foreground">
                          {(tx as any).createdBy?.name ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                          {sc.label}
                        </span>
                        {statusKey === 'REJECTED' && tx.rejectedReason && (
                          <p className="text-[10px] text-red-500 mt-0.5 max-w-[120px] truncate" title={tx.rejectedReason}>
                            {tx.rejectedReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-[13px] font-semibold text-orange-600 tabular-nums">
                          -{fmt(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ExpenseActionButtons
                          id={tx.id}
                          status={tx.status ?? 'APPROVED'}
                          isOwner={isOwner}
                          isAdmin={isAdmin}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
