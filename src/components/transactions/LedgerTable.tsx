'use client'

import * as React from 'react'
import Link from 'next/link'
import { Paperclip, Trash2, Banknote, Receipt, RotateCcw, FileText, MoreHorizontal, UserCircle } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { EditTransactionModal } from './EditTransactionModal'
import { deleteTransaction } from '@/actions/transactions'
import { getAttachmentUrl } from '@/lib/attachment-url'

type ProjectOption = { id: string; title: string }

type Attachment = {
  id: string
  originalName: string
  storageKey: string
}

type Tx = {
  id: string
  type: 'ADVANCE' | 'EXPENSE' | 'REFUND'
  date: Date | string
  amount: any
  description: string | null
  project: { id: string; title: string } | null
  attachments: Attachment[]
  createdBy: { id: string; name?: string | null } | null
}

export type LedgerTableProps = {
  transactions: Tx[]
  isAdmin: boolean
  currentUserId: string
  clientId: string
  projects: ProjectOption[]
}

function formatDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMoney(v: any) {
  const num =
    typeof v === 'number' ? v
    : typeof v === 'string' ? Number(v)
    : v?.toNumber ? v.toNumber()
    : Number(v)
  if (!Number.isFinite(num)) return '—'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num)
}

const typeConfig = {
  ADVANCE: { label: 'Avans',   icon: Banknote,    bg: 'bg-blue-50',   text: 'text-blue-700',   bar: 'bg-blue-400',   amount: 'text-blue-700' },
  EXPENSE: { label: 'Harcama', icon: Receipt,     bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-400', amount: 'text-orange-700' },
  REFUND:  { label: 'İade',    icon: RotateCcw,   bg: 'bg-emerald-50',text: 'text-emerald-700',bar: 'bg-emerald-400',amount: 'text-emerald-700' },
}

// ── Three-dot row action menu ──────────────────────────────────────────────
function ActionMenu({
  tx,
  canEdit,
  isAdmin,
  clientId,
  projects,
  onDelete,
  deleting,
  alwaysVisible = false,
}: {
  tx: Tx
  canEdit: boolean
  isAdmin: boolean
  clientId: string
  projects: ProjectOption[]
  onDelete: () => void
  deleting: boolean
  alwaysVisible?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!canEdit && !isAdmin) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={[
          'w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 focus:opacity-100',
          alwaysVisible
            ? 'opacity-100'
            : 'opacity-100 md:opacity-0 md:group-hover:opacity-100',
        ].join(' ')}
        title="İşlemler"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border shadow-lg z-40 overflow-hidden py-1">
            {canEdit && (
              <div onClick={() => setOpen(false)}>
                <EditTransactionModal
                  tx={{
                    id: tx.id,
                    type: tx.type,
                    amount: tx.amount,
                    date: tx.date,
                    description: tx.description,
                    project: tx.project ? { id: tx.project.id, title: tx.project.title } : null,
                    attachments: tx.attachments ?? [],
                  }}
                  clientId={clientId}
                  projects={projects}
                  canEdit={canEdit}
                  asMenuItem
                />
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => { setOpen(false); onDelete() }}
                disabled={deleting}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-destructive hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? 'Siliniyor...' : 'Sil'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Mobile card for a single transaction ──────────────────────────────────
function MobileCard({
  tx,
  canEdit,
  isAdmin,
  clientId,
  projects,
  onDelete,
  deleting,
}: {
  tx: Tx
  canEdit: boolean
  isAdmin: boolean
  clientId: string
  projects: ProjectOption[]
  onDelete: () => void
  deleting: boolean
}) {
  const cfg = typeConfig[tx.type]
  const Icon = cfg.icon
  const firstAttachment = tx.attachments?.[0]
  const attachmentHref = firstAttachment ? getAttachmentUrl(firstAttachment.storageKey) : null

  return (
    <div className="px-4 py-3.5 hover:bg-muted/10 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + details */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
            <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Type + date row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
              <span className="text-muted-foreground/50 text-[11px]">·</span>
              <span className="text-[11px] text-muted-foreground font-mono">{formatDate(tx.date)}</span>
            </div>

            {/* Project */}
            {tx.project && (
              <Link
                href={`/projects/${tx.project.id}`}
                className="text-[12px] font-medium text-foreground hover:text-primary transition-colors truncate block mt-0.5"
              >
                {tx.project.title}
              </Link>
            )}

            {/* Description */}
            {tx.description?.trim() && (
              <p className="text-[12px] text-muted-foreground truncate mt-0.5">{tx.description}</p>
            )}

            {/* Attachment */}
            {attachmentHref && (
              <Link
                href={attachmentHref}
                target="_blank"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-1"
                title={firstAttachment!.originalName}
              >
                <Paperclip className="h-2.5 w-2.5 shrink-0" />
                <span className="max-w-[180px] truncate">{firstAttachment!.originalName}</span>
                {tx.attachments.length > 1 && (
                  <span className="text-muted-foreground/60">+{tx.attachments.length - 1}</span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Right: amount + action */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-[14px] font-bold tabular-nums ${cfg.amount}`}>
            {formatMoney(tx.amount)}
          </span>
          <ActionMenu
            tx={tx}
            canEdit={canEdit}
            isAdmin={isAdmin}
            clientId={clientId}
            projects={projects}
            onDelete={onDelete}
            deleting={deleting}
            alwaysVisible
          />
        </div>
      </div>
    </div>
  )
}

// ── Main LedgerTable component ─────────────────────────────────────────────
export function LedgerTable({
  transactions,
  isAdmin,
  currentUserId,
  clientId,
  projects,
}: LedgerTableProps) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  async function onDelete(tx: Tx) {
    if (!isAdmin) return
    const ok = confirm('Bu kaydı silmek istediğinize emin misiniz?')
    if (!ok) return
    try {
      setDeletingId(tx.id)
      const res = await deleteTransaction(tx.id)
      if (!res?.success) {
        toast({ title: res?.error || 'Silme işlemi başarısız.', variant: 'destructive' })
        return
      }
      toast({ title: 'Kayıt silindi.' })
    } catch (e: any) {
      toast({ title: e?.message || 'Silme işlemi başarısız.', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border card-shadow flex flex-col items-center justify-center py-14 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-[13px] font-medium text-foreground">İşlem bulunamadı</p>
        <p className="text-[12px] text-muted-foreground mt-1">Bu müvekkile ait henüz kayıtlı işlem yok.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border card-shadow overflow-hidden">

      {/* ── Mobile card list (hidden md+) ──────────────────────────────── */}
      <div className="md:hidden divide-y divide-border/50">
        {transactions.map((tx) => {
          const canEdit = isAdmin || tx.createdBy?.id === currentUserId
          return (
            <MobileCard
              key={tx.id}
              tx={tx}
              canEdit={canEdit}
              isAdmin={isAdmin}
              clientId={clientId}
              projects={projects}
              onDelete={() => onDelete(tx)}
              deleting={deletingId === tx.id}
            />
          )
        })}
      </div>

      {/* ── Desktop table (hidden below md) ────────────────────────────── */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/25 border-b">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Tarih</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Tür</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Proje</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Açıklama</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Tutar</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Belge</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Ekleyen</th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {transactions.map((tx) => {
              const cfg = typeConfig[tx.type]
              const Icon = cfg.icon
              const canEdit = isAdmin || tx.createdBy?.id === currentUserId
              const firstAttachment = tx.attachments?.[0]
              const attachmentHref = firstAttachment ? getAttachmentUrl(firstAttachment.storageKey) : null

              return (
                <tr key={tx.id} className="hover:bg-muted/15 transition-colors group">
                  {/* Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[12px] text-muted-foreground font-mono">
                      {formatDate(tx.date)}
                    </span>
                  </td>

                  {/* Type badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {cfg.label}
                    </span>
                  </td>

                  {/* Project */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {tx.project ? (
                      <Link
                        href={`/projects/${tx.project.id}`}
                        className="text-[12px] text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {tx.project.title}
                      </Link>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 max-w-[240px]">
                    <span className="text-[12px] text-foreground truncate block">
                      {tx.description?.trim() || <span className="text-muted-foreground">—</span>}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`px-4 py-3 whitespace-nowrap text-right text-[13px] font-bold tabular-nums ${cfg.amount}`}>
                    {formatMoney(tx.amount)}
                  </td>

                  {/* Attachment */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {attachmentHref ? (
                      <Link
                        href={attachmentHref}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        title={firstAttachment!.originalName}
                      >
                        <Paperclip className="h-3 w-3 shrink-0" />
                        <span className="max-w-[100px] truncate">{firstAttachment!.originalName}</span>
                        {tx.attachments.length > 1 && (
                          <span className="text-muted-foreground/60">+{tx.attachments.length - 1}</span>
                        )}
                      </Link>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Audit: Created by — hidden on small screens */}
                  <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                    {tx.createdBy?.name ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-primary">
                            {tx.createdBy.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                          {tx.createdBy.name}
                        </span>
                      </div>
                    ) : (
                      <UserCircle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </td>

                  {/* Three-dot action menu */}
                  <td className="px-3 py-3 text-right">
                    <ActionMenu
                      tx={tx}
                      canEdit={canEdit}
                      isAdmin={isAdmin}
                      clientId={clientId}
                      projects={projects}
                      onDelete={() => onDelete(tx)}
                      deleting={deletingId === tx.id}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Table footer: record count */}
      <div className="px-4 py-2.5 border-t bg-muted/15">
        <p className="text-[11px] text-muted-foreground">
          {transactions.length} işlem listelendi
        </p>
      </div>
    </div>
  )
}
