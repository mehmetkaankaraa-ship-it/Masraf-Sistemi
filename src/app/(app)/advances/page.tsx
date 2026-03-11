// src/app/(app)/advances/page.tsx
import { requireCurrentUser } from '@/lib/current-user'
import { getMyAdvanceBalance, getMyRecentTransfers, getAllEmployeeSummaries } from '@/actions/advances'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Decimal } from '@prisma/client/runtime/library'
import { Banknote, ArrowUpRight, Users, ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'

function fmt(v: Decimal | number) {
  const n = v instanceof Decimal ? v.toNumber() : Number(v)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function AdvancesPage() {
  const me = await requireCurrentUser()

  if (me.role === 'ADMIN') {
    return <AdminAdvances />
  }
  return <UserAdvances />
}

async function AdminAdvances() {
  const [summaries, allTransfers] = await Promise.all([
    getAllEmployeeSummaries(),
    prisma.employeeAdvanceTransfer.findMany({
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        receiver:      { select: { id: true, name: true } },
        sentBy:        { select: { id: true, name: true } },
        sourceAccount: { select: { id: true, name: true } },
      },
    }),
  ])

  const staff = summaries.filter((s) => s.role !== 'ADMIN')
  const totalSent = allTransfers.reduce((sum, t) => {
    const n = t.amount instanceof Decimal ? t.amount.toNumber() : Number(t.amount)
    return sum + n
  }, 0)

  return (
    <div className="space-y-5 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Avanslar</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Tüm avans transferleri</p>
        </div>
        <Link
          href="/admin/transfers/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[13px] font-medium rounded-xl hover:opacity-90 transition-all shadow-sm"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Avans Gönder
        </Link>
      </div>

      {/* Staff balances */}
      {staff.length > 0 && (
        <div className="bg-white rounded-xl border card-shadow overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-foreground">Çalışan Bakiyeleri</h2>
          </div>
          <div className="divide-y divide-border/40">
            {staff.map((s) => {
              const rem = s.remaining.toNumber()
              return (
                <Link
                  key={s.id}
                  href={`/admin/users/${s.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">{s.name.slice(0, 1)}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-muted-foreground">Alınan</p>
                      <p className="text-[12px] font-medium text-violet-600 tabular-nums">{fmt(s.totalTransferred)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-muted-foreground">Harcama</p>
                      <p className="text-[12px] font-medium text-orange-600 tabular-nums">{fmt(s.totalExpenses)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Kalan</p>
                      <p className={`text-[13px] font-bold tabular-nums ${rem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(s.remaining)}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Transfer history */}
      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-foreground">Transfer Geçmişi</h2>
          </div>
          <span className="text-[12px] font-semibold text-emerald-600 tabular-nums">{fmt(totalSent)} toplam</span>
        </div>
        {allTransfers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[13px] text-muted-foreground">Henüz transfer yok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20">
                  {['Tarih', 'Alıcı', 'Kaynak Hesap', 'Not', 'Tutar'].map((h, i, arr) => (
                    <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${i === arr.length - 1 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {allTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] text-muted-foreground">{fmtDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${t.receiver.id}`} className="text-[12px] font-medium text-foreground hover:text-primary transition-colors">
                        {t.receiver.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">
                      {t.sourceAccount?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[160px] text-[11px] text-muted-foreground truncate">
                      {t.note || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[13px] font-semibold text-emerald-600 tabular-nums">+{fmt(t.amount)}</span>
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

async function UserAdvances() {
  const [balance, transfers] = await Promise.all([
    getMyAdvanceBalance(),
    getMyRecentTransfers(50),
  ])

  const remaining = balance.remaining.toNumber()

  return (
    <div className="space-y-5 max-w-[680px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Avanslarım</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Avans geçmişiniz ve mevcut bakiyeniz</p>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Alınan Avans', value: fmt(balance.totalTransferred), color: 'text-violet-700' },
          { label: 'Harcama',      value: fmt(balance.totalExpenses),    color: 'text-orange-700' },
          { label: 'Kalan Bakiye', value: fmt(balance.remaining),        color: remaining >= 0 ? 'text-emerald-700' : 'text-red-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border card-shadow px-4 py-3.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{card.label}</p>
            <p className={`text-[18px] font-bold tabular-nums ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Transfer history */}
      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-foreground">Avans Geçmişi</h2>
        </div>
        {transfers.length === 0 ? (
          <div className="py-12 text-center">
            <Banknote className="h-7 w-7 text-muted-foreground/25 mx-auto mb-2.5" />
            <p className="text-[14px] font-medium text-foreground mb-1">Henüz avans yok</p>
            <p className="text-[13px] text-muted-foreground">Yöneticinizden avans talebinde bulunun.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {transfers.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{t.sourceAccount?.name ?? 'Bilinmiyor'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {fmtDate(t.date)} · {t.sentBy.name}
                  </p>
                  {t.note && <p className="text-[11px] text-muted-foreground/60 italic mt-0.5">{t.note}</p>}
                </div>
                <span className="text-[14px] font-bold text-emerald-600 tabular-nums shrink-0 ml-3">
                  +{fmt(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
