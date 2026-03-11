// src/components/dashboard/UserAdvanceBalanceCard.tsx
import { getMyAdvanceBalance } from '@/actions/advances'
import { Wallet, ArrowDownLeft, Receipt, TrendingUp } from 'lucide-react'
import { Decimal } from '@prisma/client/runtime/library'

function fmt(v: Decimal | number) {
  const n = v instanceof Decimal ? v.toNumber() : Number(v)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

export async function UserAdvanceBalanceCard() {
  const balance = await getMyAdvanceBalance()
  const remaining = balance.remaining.toNumber()
  const isPositive = remaining >= 0

  const total = balance.totalTransferred.toNumber() + balance.totalExpenses.toNumber()
  const usedPercent = total > 0
    ? Math.min(100, Math.round((balance.totalExpenses.toNumber() / balance.totalTransferred.toNumber()) * 100))
    : 0

  return (
    <div className="bg-white rounded-xl border card-shadow overflow-hidden">
      <div className="px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

          {/* Balance */}
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <Wallet className={`h-5 w-5 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Avans Bakiyeniz</p>
              <p className={`text-[28px] font-extrabold tabular-nums tracking-tight leading-none ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmt(balance.remaining)}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                {isPositive ? 'kullanılabilir bakiye' : 'eksik bakiye'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Alınan</p>
                <p className="text-[14px] font-bold text-violet-700 tabular-nums">{fmt(balance.totalTransferred)}</p>
              </div>
            </div>

            <div className="w-px h-8 bg-border/60 shrink-0" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Receipt className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Harcanan</p>
                <p className="text-[14px] font-bold text-orange-700 tabular-nums">{fmt(balance.totalExpenses)}</p>
              </div>
            </div>

            {balance.totalTransferred.toNumber() > 0 && (
              <>
                <div className="w-px h-8 bg-border/60 shrink-0 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Kullanım</p>
                    <p className="text-[14px] font-bold text-blue-700 tabular-nums">%{usedPercent}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {balance.totalTransferred.toNumber() > 0 && (
          <div className="mt-5 pt-4 border-t">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] text-muted-foreground">Avans kullanım oranı</p>
              <p className="text-[11px] font-medium text-foreground">%{usedPercent}</p>
            </div>
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${usedPercent > 90 ? 'bg-red-500' : usedPercent > 70 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
