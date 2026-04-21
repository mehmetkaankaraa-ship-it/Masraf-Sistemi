// src/app/(app)/reports/expenses/page.tsx
import { requireRole } from "@/lib/session"
import { getExpenseReport, getReportFilterOptions } from "@/actions/reports"
import { ExpenseFilters } from "@/components/reports/ExpenseFilters"
import type {
  UserBreakdown,
  ClientBreakdown,
  ProjectBreakdown,
  RawTransaction,
} from "@/actions/reports"

const categoryLabels: Record<string, string> = {
  OFFICE: "Ofis",
  TRAVEL: "Seyahat",
  COURT_FEES: "Mahkeme Harcı",
  SHIPPING: "Kargo",
  NOTARY: "Noter",
  TAX: "Vergi",
  OTHER: "Diğer",
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Taslak", color: "#6b7280" },
  SUBMITTED: { label: "Onay Bekliyor", color: "#d97706" },
  APPROVED: { label: "Onaylandı", color: "#059669" },
  REJECTED: { label: "Reddedildi", color: "#dc2626" },
}

function fmt(v: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(v)
}

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default async function ExpenseAnalysisPage({
  searchParams,
}: {
  searchParams: {
    from?: string
    to?: string
    clientId?: string
    projectId?: string
    userId?: string
  }
}) {
  await requireRole("ADMIN")

  const filters = {
    from: searchParams.from,
    to: searchParams.to,
    clientId: searchParams.clientId,
    projectId: searchParams.projectId,
    userId: searchParams.userId,
  }

  const [report, options] = await Promise.all([
    getExpenseReport(filters),
    getReportFilterOptions(),
  ])

  const { totals, groupedByUser, groupedByClient, groupedByProject, rawTransactions } =
    report

  const pendingAmount = totals.total - totals.approvedTotal

  return (
    <div className="max-w-[1100px] space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Gider Analizi</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Çalışan, müvekkil ve proje bazında detaylı harcama raporu
        </p>
      </div>

      {/* Filters */}
      <ExpenseFilters
        clients={options.clients}
        projects={options.projects}
        users={options.users}
        current={filters}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Toplam Gider"
          value={fmt(totals.total)}
          sub={`${totals.count} kayıt`}
          valueClass="text-orange-600"
        />
        <SummaryCard
          label="Onaylanan"
          value={fmt(totals.approvedTotal)}
          sub={
            totals.total > 0
              ? `${((totals.approvedTotal / totals.total) * 100).toFixed(0)}% onay oranı`
              : "—"
          }
          valueClass="text-emerald-600"
        />
        <SummaryCard
          label="Onay Bekleyen"
          value={fmt(pendingAmount)}
          sub={pendingAmount > 0 ? "işlem bekliyor" : "tümü onaylandı"}
          valueClass={pendingAmount > 0 ? "text-amber-600" : "text-muted-foreground"}
        />
      </div>

      {/* Empty state */}
      {rawTransactions.length === 0 && (
        <div className="bg-white rounded-xl border card-shadow py-16 text-center">
          <p className="text-[14px] font-medium text-foreground">Kayıt bulunamadı</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            Seçilen kriterlere uygun gider işlemi yok.
          </p>
        </div>
      )}

      {rawTransactions.length > 0 && (
        <>
          {/* Breakdown grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <BreakdownCard
              title="Çalışana Göre"
              rows={groupedByUser.map((r) => ({
                label: r.userName,
                total: r.total,
                count: r.count,
              }))}
              grandTotal={totals.total}
            />
            <BreakdownCard
              title="Müvekkile Göre"
              rows={groupedByClient.map((r) => ({
                label: r.clientName,
                total: r.total,
                count: r.count,
              }))}
              grandTotal={totals.total}
            />
            <BreakdownCard
              title="Projeye Göre"
              rows={groupedByProject.map((r) => ({
                label: r.projectTitle,
                total: r.total,
                count: r.count,
              }))}
              grandTotal={totals.total}
            />
          </div>

          {/* Detail table */}
          <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold">İşlem Detayları</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {rawTransactions.length} kayıt
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b bg-muted/20">
                    {[
                      "Tarih",
                      "Çalışan",
                      "Müvekkil",
                      "Proje",
                      "Kategori",
                      "Durum",
                      "Tutar",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${
                          i === 6 ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rawTransactions.map((tx) => {
                    const sc =
                      statusConfig[(tx.status ?? "APPROVED") as string] ??
                      statusConfig.APPROVED
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                          {fmtDate(tx.date)}
                        </td>
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                          {tx.user.name}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {tx.client.name}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-[180px]">
                          {tx.project
                            ? `${tx.project.fileNo} — ${tx.project.title}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                          {tx.category
                            ? (categoryLabels[tx.category] ?? tx.category)
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                              color: sc.color,
                              backgroundColor: sc.color + "15",
                            }}
                          >
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-orange-600 tabular-nums whitespace-nowrap">
                          {fmt(tx.amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/10">
                    <td
                      colSpan={6}
                      className="px-4 py-3 text-[12px] font-semibold text-right text-foreground"
                    >
                      Toplam
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600 tabular-nums">
                      {fmt(totals.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: string
  sub: string
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-xl border card-shadow px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`text-[22px] font-bold tabular-nums mt-1 ${valueClass ?? ""}`}>
        {value}
      </p>
      <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

function BreakdownCard({
  title,
  rows,
  grandTotal,
}: {
  title: string
  rows: Array<{ label: string; total: number; count: number }>
  grandTotal: number
}) {
  return (
    <div className="bg-white rounded-xl border card-shadow overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
          —
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {rows.map((row) => (
            <div
              key={row.label}
              className="px-4 py-2.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[12px] font-medium truncate">{row.label}</p>
                <p className="text-[11px] text-muted-foreground">{row.count} kayıt</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[12px] font-semibold tabular-nums text-orange-600">
                  {new Intl.NumberFormat("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                    minimumFractionDigits: 2,
                  }).format(row.total)}
                </p>
                {grandTotal > 0 && (
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    %{((row.total / grandTotal) * 100).toFixed(0)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
