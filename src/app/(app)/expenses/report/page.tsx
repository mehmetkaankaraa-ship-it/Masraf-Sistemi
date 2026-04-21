// src/app/(app)/expenses/report/page.tsx
import { requireCurrentUser } from '@/lib/current-user'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { ExcelExportButton } from '@/components/expenses/ExcelExportButton'
import { PrintButton } from '@/components/expenses/PrintButton'

function fmt(v: Decimal | number) {
  const n = v instanceof Decimal ? v.toNumber() : Number(v)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const categoryLabels: Record<string, string> = {
  OFFICE: 'Ofis', TRAVEL: 'Seyahat', COURT_FEES: 'Mahkeme Harcı',
  SHIPPING: 'Kargo', NOTARY: 'Noter', TAX: 'Vergi', OTHER: 'Diğer',
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Taslak',        color: '#6b7280' },
  SUBMITTED: { label: 'Onay Bekliyor', color: '#d97706' },
  APPROVED:  { label: 'Onaylandı',     color: '#059669' },
  REJECTED:  { label: 'Reddedildi',    color: '#dc2626' },
}

export default async function ExpenseReportPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; userId?: string; clientId?: string }
}) {
  const me = await requireCurrentUser()
  const isAdmin = me.role === 'ADMIN'

  const from      = searchParams.from     ?? ''
  const to        = searchParams.to       ?? ''
  const clientId  = searchParams.clientId ?? ''
  const filterUserId = isAdmin ? (searchParams.userId ?? '') : me.id

  const where: any = { type: 'EXPENSE' }
  if (filterUserId) where.createdById = filterUserId
  if (clientId)     where.clientId    = clientId

  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to)   where.date.lte = new Date(to)
  }

  const [expenses, users, clients] = await Promise.all([
    prisma.ledgerTransaction.findMany({
      where,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: {
        client:    { select: { name: true } },
        project:   { select: { fileNo: true, title: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { name: true } },
      },
    }),
    isAdmin
      ? prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
    isAdmin
      ? prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
  ])

  const total = expenses.reduce((acc, tx) => acc + Number(tx.amount), 0)
  const approvedTotal = expenses
    .filter((tx) => (tx.status ?? 'APPROVED') === 'APPROVED')
    .reduce((acc, tx) => acc + Number(tx.amount), 0)

  // Rapor başlığı için tarih aralığı metni
  let dateLabel = ''
  if (from && to)   dateLabel = `${fmtDate(from)} – ${fmtDate(to)}`
  else if (from)    dateLabel = `${fmtDate(from)} sonrası`
  else if (to)      dateLabel = `${fmtDate(to)} öncesi`

  const reportTitle = dateLabel ? `Gider Raporu — ${dateLabel}` : 'Gider Raporu'

  const filterName = filterUserId
    ? expenses[0]?.createdBy?.name ?? users.find((u) => u.id === filterUserId)?.name ?? ''
    : 'Tüm Çalışanlar'

  const clientName = clientId
    ? clients.find((c) => c.id === clientId)?.name ?? ''
    : ''

  return (
    <div className="max-w-[900px] space-y-4">
      {/* Kontroller (yazdırmada gizli) */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold">Gider Raporu</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{expenses.length} kayıt</p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex flex-wrap items-end gap-2">
            {/* Tarih aralığı */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
                Başlangıç
              </label>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="h-9 px-3 text-[13px] border rounded-xl outline-none focus:border-primary/60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
                Bitiş
              </label>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="h-9 px-3 text-[13px] border rounded-xl outline-none focus:border-primary/60"
              />
            </div>

            {/* Müvekkil filtresi (sadece admin) */}
            {isAdmin && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
                  Müvekkil
                </label>
                <select
                  name="clientId"
                  defaultValue={clientId}
                  className="h-9 px-3 text-[13px] border rounded-xl outline-none focus:border-primary/60 bg-white"
                >
                  <option value="">Tüm Müvekkiller</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Çalışan filtresi (sadece admin) */}
            {isAdmin && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
                  Çalışan
                </label>
                <select
                  name="userId"
                  defaultValue={filterUserId}
                  className="h-9 px-3 text-[13px] border rounded-xl outline-none focus:border-primary/60 bg-white"
                >
                  <option value="">Tüm Çalışanlar</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="h-9 px-4 text-[13px] font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors self-end"
            >
              Filtrele
            </button>
          </form>

          <ExcelExportButton from={from} to={to} userId={filterUserId} clientId={clientId} />
          <PrintButton />
        </div>
      </div>

      {/* Yazdırılabilir rapor */}
      <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
        {/* Rapor başlığı */}
        <div className="px-6 py-5 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-foreground">{reportTitle}</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                {filterName}{clientName ? ` · ${clientName}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Rapor Tarihi</p>
              <p className="text-[13px] font-medium">{fmtDate(new Date())}</p>
            </div>
          </div>

          {/* Özet satırı */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Toplam Gider</p>
              <p className="text-[16px] font-bold text-orange-600 tabular-nums">{fmt(total)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Onaylanan</p>
              <p className="text-[16px] font-bold text-emerald-600 tabular-nums">{fmt(approvedTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kayıt Sayısı</p>
              <p className="text-[16px] font-bold tabular-nums">{expenses.length}</p>
            </div>
          </div>
        </div>

        {/* Tablo */}
        {expenses.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-muted-foreground">
            Bu kriterlere uygun gider kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b bg-muted/20">
                  {['Tarih', 'Müvekkil / Proje', 'Açıklama', 'Kategori', 'Durum', 'Tutar'].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${i === 5 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {expenses.map((tx) => {
                  const sc = statusConfig[(tx.status ?? 'APPROVED') as string] ?? statusConfig.APPROVED
                  return (
                    <tr key={tx.id}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(tx.date)}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{tx.client.name}</p>
                        {tx.project && (
                          <p className="text-[11px] text-muted-foreground">{tx.project.fileNo} — {tx.project.title}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 max-w-[160px]">
                        <span className="truncate block text-muted-foreground">{tx.description || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                        {tx.category ? (categoryLabels[tx.category] ?? tx.category) : '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ color: sc.color, backgroundColor: sc.color + '15' }}>
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
                  <td colSpan={5} className="px-4 py-3 text-[12px] font-semibold text-right">Toplam</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600 tabular-nums">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* İmza alanı */}
        <div className="px-6 py-6 border-t mt-2">
          <div className="flex items-end justify-between">
            <div className="text-[11px] text-muted-foreground">
              <p>Bu rapor {fmtDate(new Date())} tarihinde oluşturulmuştur.</p>
              {expenses[0]?.approvedBy && (
                <p className="mt-1">Onaylayan: {expenses[0].approvedBy.name}</p>
              )}
            </div>
            <div className="text-center">
              <div className="w-48 border-b-2 border-foreground/30 mb-1 h-10" />
              <p className="text-[11px] text-muted-foreground">İmza / Kaşe</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .bg-white, .bg-white * { visibility: visible; }
          .bg-white { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}
