// src/app/(app)/admin/users/[id]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/session'
import { getEmployeeDetail } from '@/actions/advances'
import { Decimal } from '@prisma/client/runtime/library'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  ArrowLeft, Banknote, Receipt, Wallet,
  Users, Hash, TrendingUp, TrendingDown, Activity, ArrowDownLeft,
} from 'lucide-react'
import { SendAdvanceModal }           from '@/components/advances/SendAdvanceModal'
import { RecordAdvanceReturnModal }   from '@/components/advances/RecordAdvanceReturnModal'

type PageProps = { params: { id: string } }

function formatTRY(v: Decimal | number | string) {
  const n = v instanceof Decimal ? v.toNumber() : Number(v)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n)
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  await requireRole('ADMIN')

  const detail = await getEmployeeDetail(params.id)
  if (!detail) notFound()

  const { user, transfers, expenses, advanceReturns, balance, clientBreakdown } = detail
  const balanceNum = balance.remaining.toNumber()

  return (
    <div className="space-y-6 max-w-[1100px]">

      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Kullanıcılara Dön
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border card-shadow px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-base font-bold text-primary">{user.name.slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">{user.name}</h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{user.role}</span>
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: tr })} tarihinde katıldı
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RecordAdvanceReturnModal employeeId={user.id} employeeName={user.name} />
            <SendAdvanceModal employeeId={user.id} employeeName={user.name} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl border card-shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-violet-600" />
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">Toplam Gönderilen Avans</p>
          <p className="text-xl font-bold text-violet-600 tabular-nums">{formatTRY(balance.totalTransferred)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{transfers.length} transfer</p>
        </div>

        <div className="bg-white rounded-2xl border card-shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-orange-600" />
            </div>
            <TrendingDown className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">Toplam Harcama</p>
          <p className="text-xl font-bold text-orange-600 tabular-nums">{formatTRY(balance.totalExpenses)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{expenses.length} işlem</p>
        </div>

        <div className={`rounded-2xl border card-shadow p-5 ${balanceNum >= 0 ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-[11px] text-white/70 uppercase tracking-wide font-medium mb-1">Kalan Bakiye</p>
          <p className="text-xl font-bold text-white tabular-nums">{formatTRY(balance.remaining)}</p>
          <p className="text-[11px] text-white/60 mt-1">avans - harcama - iade</p>
        </div>

        <div className="bg-white rounded-2xl border card-shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <Hash className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">İşlem Sayısı</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{expenses.length + transfers.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{transfers.length} avans + {expenses.length} harcama</p>
        </div>

      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1fr_280px] gap-5">

        {/* Transfers */}
        <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold">Gönderilen Avanslar</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">{transfers.length} kayıt</span>
          </div>
          {transfers.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">Avans kaydı yok.</div>
          ) : (
            <div className="divide-y divide-border/60 max-h-[400px] overflow-y-auto">
              {transfers.map((t) => (
                <div key={t.id} className="flex items-start justify-between px-5 py-3 hover:bg-muted/15 transition-colors">
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{t.sourceAccount?.name ?? 'Bilinmiyor'}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{format(new Date(t.date), 'dd.MM.yyyy')} - {t.sentBy.name}</p>
                    {t.note && <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{t.note}</p>}
                  </div>
                  <span className="text-[13px] font-semibold text-violet-600 tabular-nums shrink-0 ml-3">+{formatTRY(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold">Harcamalar</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">{expenses.length} kayıt</span>
          </div>
          {expenses.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">Harcama yok.</div>
          ) : (
            <div className="divide-y divide-border/60 max-h-[400px] overflow-y-auto">
              {expenses.map((tx) => (
                <div key={tx.id} className="flex items-start justify-between px-5 py-3 hover:bg-muted/15 transition-colors">
                  <div className="min-w-0 flex-1">
                    <Link href={`/clients/${tx.client.id}`} className="text-[12px] font-medium text-foreground hover:text-primary transition-colors truncate block">
                      {tx.client.name}
                    </Link>
                    {tx.project && <p className="text-[10px] text-muted-foreground">{tx.project.title}</p>}
                    <p className="text-[11px] text-muted-foreground">{format(new Date(tx.date), 'dd.MM.yyyy')}{tx.description ? ' - ' + tx.description : ''}</p>
                  </div>
                  <span className="text-[13px] font-semibold text-orange-600 tabular-nums shrink-0 ml-3">-{formatTRY(tx.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advance Returns */}
        <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold">Avans İadeleri</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">{advanceReturns.length} kayıt</span>
          </div>
          {advanceReturns.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">İade kaydı yok.</div>
          ) : (
            <div className="divide-y divide-border/60 max-h-[400px] overflow-y-auto">
              {advanceReturns.map((r) => (
                <div key={r.id} className="flex items-start justify-between px-5 py-3 hover:bg-muted/15 transition-colors">
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{r.recordedBy.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{format(new Date(r.date), 'dd.MM.yyyy')}</p>
                    {r.note && <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{r.note}</p>}
                  </div>
                  <span className="text-[13px] font-semibold text-emerald-600 tabular-nums shrink-0 ml-3">-{formatTRY(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client breakdown */}
        <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold">Müvekkil Bazlı Harcama</h2>
          </div>
          {clientBreakdown.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">Harcama kaydı yok.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {clientBreakdown.map((item) => {
                const pct = balance.totalExpenses.isZero() ? 0 : item.amount.div(balance.totalExpenses).mul(100).toNumber()
                return (
                  <div key={item.clientId} className="px-5 py-3.5 hover:bg-muted/15 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Link href={`/clients/${item.clientId}`} className="text-[12px] font-medium text-foreground hover:text-primary transition-colors truncate">
                        {item.clientName}
                      </Link>
                      <span className="text-[12px] font-semibold text-orange-600 tabular-nums shrink-0">{formatTRY(item.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.count} işlem</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
