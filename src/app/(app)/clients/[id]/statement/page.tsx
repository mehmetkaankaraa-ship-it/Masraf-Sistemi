import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { getClientById } from "@/actions/clients"
import PrintButton from "./print-button"
import DateRangeFilter from "./date-range-filter"
import { format } from "date-fns"
import { ArrowLeft, Scale } from "lucide-react"

function formatTRY(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value)
}

export default async function ClientStatementPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { from?: string; to?: string }
}) {
  const session = await requireSession()

  const client = await getClientById(params.id)
  if (!client) notFound()

  const from = searchParams?.from ? new Date(searchParams.from) : null
  const to   = searchParams?.to   ? new Date(searchParams.to)   : null

  const where: any = { clientId: client.id }
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = from
    if (to)   where.date.lte = to
  }

  const txs = await prisma.ledgerTransaction.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      project:     { select: { fileNo: true, title: true } },
      attachments: { select: { id: true, originalName: true, storageKey: true } },
    },
  })

  let running = 0
  const rows = txs.map((t) => {
    const amt = Number(t.amount)
    if (t.type === "ADVANCE") running += amt
    else running -= amt
    return {
      id: t.id, date: t.date, type: t.type, amount: amt,
      project: t.project ? t.project.title : "—",
      description: t.description ?? "",
      balance: running,
      attachments: t.attachments ?? [],
    }
  })

  const totalAdvance = rows.filter((r) => r.type === "ADVANCE").reduce((a, r) => a + r.amount, 0)
  const totalExpense = rows.filter((r) => r.type === "EXPENSE").reduce((a, r) => a + r.amount, 0)
  const totalRefund  = rows.filter((r) => r.type === "REFUND").reduce((a, r) => a + r.amount, 0)
  const endingBalance = running

  const periodLabel =
    from || to
      ? `${from ? format(from, "dd.MM.yyyy") : "…"} – ${to ? format(to, "dd.MM.yyyy") : "…"}`
      : "Tüm Kayıtlar"

  const generatedAt = format(new Date(), "dd.MM.yyyy HH:mm")

  return (
    <div className="min-h-full">
      {/* Print-specific global overrides injected into head */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-doc {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .print-page { padding: 24px 32px !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}} />

      {/* ── Screen-only top bar ── */}
      <div className="no-print space-y-4 mb-6">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {client.name}
        </Link>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border rounded-xl p-1 w-fit card-shadow">
          {[
            { label: 'Genel',         href: `/clients/${client.id}` },
            { label: 'İşlemler',      href: `/clients/${client.id}?tab=transactions` },
            { label: 'Ekstre (PDF)',  href: `/clients/${client.id}/statement`, active: true },
          ].map(({ label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-150 ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Date range filter */}
        <DateRangeFilter clientId={client.id} from={searchParams?.from} to={searchParams?.to} />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <PrintButton />
          <p className="text-[12px] text-muted-foreground">
            PDF almak için: Yazdır → "PDF olarak kaydet"
          </p>
        </div>
      </div>

      {/* ── Statement Document ── */}
      <div className="print-doc bg-white rounded-2xl border card-shadow overflow-hidden print-page">
        <div className="px-8 py-7">

          {/* Letterhead */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-foreground/10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Scale className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">Avans Ledger</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Hukuk Bürosu Yönetim Sistemi</p>
                </div>
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Masraf Avansı Ekstresi</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">Dönem: <span className="font-medium text-foreground">{periodLabel}</span></p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Müvekkil</p>
              <p className="text-[15px] font-bold text-foreground">{client.name}</p>
              {client.email && <p className="text-[12px] text-muted-foreground">{client.email}</p>}
              {client.phone && <p className="text-[12px] text-muted-foreground">{client.phone}</p>}
              <p className="text-[11px] text-muted-foreground mt-2">Oluşturma: {generatedAt}</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3 my-6">
            {[
              { label: 'Toplam Avans',     value: totalAdvance,   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Toplam Harcama',   value: totalExpense,   color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-100' },
              { label: 'Toplam İade',      value: totalRefund,    color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-100' },
              { label: 'Dönem Sonu Bakiye',value: endingBalance,  color: endingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700', bg: endingBalance >= 0 ? 'bg-emerald-50' : 'bg-rose-50', border: endingBalance >= 0 ? 'border-emerald-100' : 'border-rose-100' },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className={`rounded-xl p-3.5 border ${bg} ${border}`}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={`text-[15px] font-bold tabular-nums mt-1 ${color}`}>{formatTRY(value)}</p>
              </div>
            ))}
          </div>

          {/* Transaction table */}
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b">
                  {['Tarih', 'Tür', 'Proje', 'Açıklama', 'Belge', 'Tutar', 'Bakiye'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3.5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide ${i >= 5 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3.5 py-8 text-center text-[13px] text-muted-foreground" colSpan={7}>
                      Seçili dönemde kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const typeMap: Record<string, { label: string; bg: string; text: string; sign: string }> = {
                      ADVANCE: { label: 'Avans',   bg: 'bg-emerald-50', text: 'text-emerald-700', sign: '+' },
                      EXPENSE: { label: 'Harcama', bg: 'bg-rose-50',    text: 'text-rose-700',    sign: '−' },
                      REFUND:  { label: 'İade',    bg: 'bg-rose-50',    text: 'text-rose-700',    sign: '−' },
                    }
                    const cfg = typeMap[r.type] ?? typeMap.EXPENSE
                    return (
                      <tr key={r.id} className="hover:bg-muted/15 transition-colors">
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-[12px] text-muted-foreground">
                          {format(new Date(r.date), "dd.MM.yyyy")}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-[12px] text-muted-foreground max-w-[120px] truncate">
                          {r.project}
                        </td>
                        <td className="px-3.5 py-2.5 text-[12px] text-foreground max-w-[200px] truncate">
                          {r.description || "—"}
                        </td>
                        <td className="px-3.5 py-2.5">
                          {r.attachments.length > 0 ? (
                            <div className="space-y-0.5">
                              {r.attachments.map((a) => (
                                <p key={a.id} className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                                  {a.originalName}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={`px-3.5 py-2.5 text-right text-[13px] font-semibold tabular-nums whitespace-nowrap ${cfg.text}`}>
                          {cfg.sign}{formatTRY(r.amount)}
                        </td>
                        <td className={`px-3.5 py-2.5 text-right text-[13px] font-semibold tabular-nums whitespace-nowrap ${r.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatTRY(r.balance)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Bu ekstre sistem kayıtlarından otomatik üretilmiştir.
            </p>
            <p className="text-[11px] text-muted-foreground">
              {rows.length} kayıt · {generatedAt}
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
