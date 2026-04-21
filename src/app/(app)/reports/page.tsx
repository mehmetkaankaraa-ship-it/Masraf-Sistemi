// src/app/(app)/reports/page.tsx
import { requireSession } from "@/lib/session"
import { isAdmin } from "@/lib/session"
import { BarChart3, ArrowRight, Receipt } from "lucide-react"
import Link from "next/link"

export default async function ReportsPage() {
  await requireSession()
  const admin = await isAdmin()

  return (
    <div className="max-w-[640px]">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Raporlar</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Finansal raporlar ve analizler
        </p>
      </div>

      <div className="space-y-3">
        {admin ? (
          <Link
            href="/reports/expenses"
            className="bg-white rounded-xl border card-shadow px-5 py-4 flex items-center gap-4 hover:border-primary/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foreground">Gider Analizi</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Çalışan, müvekkil ve proje bazında harcama raporu
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
          </Link>
        ) : (
          <div className="bg-white rounded-xl border card-shadow">
            <div className="py-16 text-center px-8">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-[14px] font-semibold text-foreground mb-1.5">Yakında</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Aylık harcama raporları, müvekkil bazlı analizler ve ihracat araçları bu
                bölümde yer alacak.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
