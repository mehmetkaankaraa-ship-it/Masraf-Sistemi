'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense } from '@/actions/transactions'
import {
  X, Receipt, Loader2, UploadCloud, FileText, ImageIcon,
  File, CheckCircle2, AlertCircle, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type Client  = { id: string; name: string }
type Project = { id: string; title: string; fileNo: string; clientId: string }

/** Matches the attachmentMetaSchema in lib/schemas.ts */
type AttachmentMeta = {
  originalName: string
  storageKey:   string
  mimeType:     string
  sizeBytes:    number
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'done';      meta: AttachmentMeta }
  | { status: 'error';     message: string }

interface Props {
  open: boolean
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_EXT   = '.pdf,.jpg,.jpeg,.png,.webp'
const MAX_BYTES      = 10 * 1024 * 1024   // 10 MB

function todayISO() { return new Date().toISOString().slice(0, 10) }

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon
  if (mime === 'application/pdf')  return FileText
  return File
}

// ─── Dropzone sub-component ───────────────────────────────────────────────────

function DropZone({
  uploadState,
  onFile,
  onClear,
}: {
  uploadState: UploadState
  onFile: (f: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ title: 'Desteklenmeyen dosya türü. PDF, JPG veya PNG yükleyin.', variant: 'destructive' })
      return
    }
    if (f.size > MAX_BYTES) {
      toast({ title: 'Dosya 10 MB sınırını aşıyor.', variant: 'destructive' })
      return
    }
    onFile(f)
  }, [onFile])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    // reset so same file can be re-picked
    e.target.value = ''
  }

  // ── Uploading state ──
  if (uploadState.status === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-primary/30 rounded-xl px-4 py-5 bg-primary/[0.03]">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <p className="text-[12px] font-medium text-foreground">Yükleniyor…</p>
        <div className="w-full max-w-[180px] h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${uploadState.progress}%` }}
          />
        </div>
      </div>
    )
  }

  // ── Done / file attached state ──
  if (uploadState.status === 'done') {
    const { meta } = uploadState
    const Icon = fileIcon(meta.mimeType)
    return (
      <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50/60 rounded-xl px-3.5 py-3 group">
        {/* icon */}
        <div className="w-9 h-9 rounded-lg bg-white border border-emerald-200 flex items-center justify-center shrink-0 shadow-sm">
          <Icon className="h-4 w-4 text-emerald-600" />
        </div>

        {/* file info */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-foreground truncate">{meta.originalName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="text-[11px] text-emerald-600 font-medium">Yüklendi</span>
            <span className="text-[11px] text-muted-foreground">· {formatBytes(meta.sizeBytes)}</span>
          </div>
        </div>

        {/* remove */}
        <button
          type="button"
          onClick={onClear}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
          title="Kaldır"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  // ── Error state ──
  if (uploadState.status === 'error') {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-red-200 rounded-xl px-4 py-5 bg-red-50/40 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED_EXT} onChange={onChange} className="hidden" />
        <AlertCircle className="h-5 w-5 text-red-500" />
        <div className="text-center">
          <p className="text-[12px] font-medium text-red-700">{uploadState.message}</p>
          <p className="text-[11px] text-red-500 mt-0.5">Tekrar denemek için tıkla</p>
        </div>
      </div>
    )
  }

  // ── Idle drop zone ──
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'flex flex-col items-center justify-center gap-2.5',
        'border-2 border-dashed rounded-xl px-4 py-5 cursor-pointer',
        'transition-all duration-200 select-none',
        dragging
          ? 'border-primary bg-primary/5 scale-[1.01] shadow-sm'
          : 'border-border hover:border-primary/50 hover:bg-muted/20',
      ].join(' ')}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED_EXT} onChange={onChange} className="hidden" />

      {/* Icon */}
      <div className={[
        'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
        dragging ? 'bg-primary/10' : 'bg-muted',
      ].join(' ')}>
        <UploadCloud className={`h-4 w-4 transition-colors ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-[12px] font-semibold text-foreground">
          {dragging ? 'Bırakın…' : 'Dekont / Belge Ekle'}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Sürükle-bırak veya tıkla · PDF, JPG, PNG · maks. 10 MB
        </p>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function QuickExpenseModal({ open, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // form state
  const [clients,           setClients]          = useState<Client[]>([])
  const [projects,          setProjects]          = useState<Project[]>([])
  const [selectedClientId,  setSelectedClientId]  = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [amount,            setAmount]            = useState('')
  const [date,              setDate]              = useState(todayISO)
  const [description,       setDescription]       = useState('')
  const [error,             setError]             = useState('')
  const [loadingClients,    setLoadingClients]    = useState(false)

  // upload state
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })

  // ── Load clients on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setLoadingClients(true)
    fetch('/api/clients-list')
      .then(r => r.ok ? r.json() : { clients: [] })
      .then(d => setClients(d.clients ?? []))
      .catch(() => {})
      .finally(() => setLoadingClients(false))
  }, [open])

  // ── Load projects when client changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedClientId) { setProjects([]); setSelectedProjectId(''); return }
    fetch(`/api/projects-list?clientId=${selectedClientId}`)
      .then(r => r.ok ? r.json() : { projects: [] })
      .then(d => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
  }, [selectedClientId])

  // ── Reset everything ──────────────────────────────────────────────────────
  function reset() {
    setSelectedClientId('')
    setSelectedProjectId('')
    setAmount('')
    setDate(todayISO())
    setDescription('')
    setError('')
    setClients([])
    setProjects([])
    setUploadState({ status: 'idle' })
  }

  function handleClose() { reset(); onClose() }

  // ── Upload a picked file ──────────────────────────────────────────────────
  async function handleFileSelected(file: File) {
    setUploadState({ status: 'uploading', progress: 20 })

    // Animate progress a bit while real upload happens
    const tick = setInterval(() => {
      setUploadState(prev =>
        prev.status === 'uploading' && prev.progress < 80
          ? { status: 'uploading', progress: prev.progress + 15 }
          : prev
      )
    }, 200)

    try {
      const fd = new FormData()
      fd.append('files', file)           // the route expects key "files"

      const res  = await fetch('/api/uploads', { method: 'POST', body: fd })
      const json = await res.json()

      clearInterval(tick)

      if (!res.ok || json.error) {
        setUploadState({ status: 'error', message: json.error ?? 'Yükleme başarısız.' })
        return
      }

      // /api/uploads returns { attachments: [{ originalName, storageKey, mimeType, sizeBytes }] }
      const saved = json.attachments?.[0] as AttachmentMeta | undefined
      if (!saved) {
        setUploadState({ status: 'error', message: 'Sunucu yanıtı geçersiz.' })
        return
      }

      setUploadState({ status: 'done', meta: saved })
    } catch (e: any) {
      clearInterval(tick)
      setUploadState({ status: 'error', message: e?.message ?? 'Yükleme başarısız.' })
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const num = Number(amount)
    if (!selectedClientId)                          { setError('Müvekkil seçiniz.'); return }
    if (!amount || !Number.isFinite(num) || num <= 0) { setError('Geçerli bir tutar giriniz.'); return }
    if (!date)                                       { setError('Tarih zorunludur.'); return }
    if (uploadState.status === 'uploading')          { setError('Dosya yükleniyor, lütfen bekleyin.'); return }

    const attachmentMeta: AttachmentMeta[] =
      uploadState.status === 'done' ? [uploadState.meta] : []

    startTransition(async () => {
      try {
        const result = await createExpense({
          clientId:       selectedClientId,
          projectId:      selectedProjectId || undefined,
          amount:         num,
          date,
          description:    description || undefined,
          category:       'OTHER',
          paymentMethod:  'TRANSFER',
          attachmentMeta,
        })

        if (!result.success) {
          setError(result.error)
        } else {
          toast({
            title: attachmentMeta.length
              ? '✓ Harcama ve dekont kaydedildi.'
              : '✓ Harcama kaydedildi.',
          })
          handleClose()
          router.refresh()
        }
      } catch (e: any) {
        setError(e?.message ?? 'İşlem kaydedilemedi.')
      }
    })
  }

  if (!open) return null

  const busy = isPending || uploadState.status === 'uploading'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,12,20,0.50)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{
          maxWidth: '500px',
          maxHeight: '90vh',
          border: '1px solid hsl(var(--border))',
          animation: 'modal-in 0.18s ease-out',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-orange-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Harcama Ekle</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">
          <form id="quick-expense-form" onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-red-50 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-[13px] text-red-700">{error}</p>
              </div>
            )}

            {/* ── Müvekkil ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Müvekkil <span className="text-red-500">*</span>
              </Label>
              {loadingClients ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-muted/30 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Yükleniyor…
                </div>
              ) : (
                <select
                  className="w-full px-3 py-2.5 rounded-xl border bg-white text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  value={selectedClientId}
                  onChange={(e) => { setSelectedClientId(e.target.value); setSelectedProjectId('') }}
                >
                  <option value="">Müvekkil seçin…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* ── Proje ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Proje (opsiyonel)</Label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border bg-white text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={!selectedClientId || projects.length === 0}
              >
                <option value="">
                  {!selectedClientId
                    ? 'Önce müvekkil seçin'
                    : projects.length === 0
                      ? 'Proje bulunamadı'
                      : 'Genel (projeye bağlı değil)'}
                </option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.fileNo})</option>
                ))}
              </select>
            </div>

            {/* ── Tutar + Tarih ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Tutar (TRY) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Tarih <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* ── Açıklama ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Açıklama</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opsiyonel…"
                className="rounded-xl"
              />
            </div>

            {/* ══ UPLOAD ZONE ══════════════════════════════════════════════ */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Dekont / Belge
                <span className="text-[10px] text-muted-foreground/60 font-normal">(opsiyonel)</span>
              </Label>
              <DropZone
                uploadState={uploadState}
                onFile={handleFileSelected}
                onClear={() => setUploadState({ status: 'idle' })}
              />
            </div>
            {/* ═════════════════════════════════════════════════════════════ */}

          </form>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t shrink-0 flex gap-2">
          <Button
            type="submit"
            form="quick-expense-form"
            disabled={busy}
            className="flex-1 rounded-xl gap-2"
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor…</>
            ) : uploadState.status === 'uploading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Dosya yükleniyor…</>
            ) : (
              'Kaydet'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={busy}
            className="rounded-xl"
          >
            İptal
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  )
}
