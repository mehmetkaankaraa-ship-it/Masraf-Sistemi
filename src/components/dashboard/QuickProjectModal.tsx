'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/actions/projects'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast }    from '@/components/ui/use-toast'
import {
  FolderPlus, Loader2, AlertCircle,
  ChevronsUpDown, Check, Search,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = { id: string; name: string }

interface Props {
  open: boolean
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genAutoFileNo() {
  const d  = new Date()
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `PRJ-${yy}${mm}${dd}-${hh}${mi}${ss}`
}

// ─── Searchable client combobox ────────────────────────────────────────────────

function ClientCombobox({
  clients,
  loading,
  value,
  onChange,
  disabled,
}: {
  clients:  Client[]
  loading:  boolean
  value:    string          // selected clientId
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = clients.find(c => c.id === value)

  const filtered = query.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(v => !v)}
        className={[
          'w-full flex items-center justify-between gap-2',
          'px-3 py-2.5 rounded-xl border bg-white text-sm',
          'outline-none transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open
            ? 'border-primary ring-2 ring-primary/10'
            : 'hover:border-border/80',
        ].join(' ')}
      >
        <span className={selected ? 'text-foreground font-medium' : 'text-muted-foreground'}>
          {loading
            ? 'Yükleniyor…'
            : selected
              ? selected.name
              : 'Müvekkil seçin…'}
        </span>
        {loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
          : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        }
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={[
            'absolute z-50 mt-1.5 w-full bg-white border rounded-xl shadow-lg',
            'overflow-hidden',
          ].join(' ')}
          style={{ maxHeight: '220px' }}
        >
          {/* Search input inside dropdown */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ara…"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options list */}
          <div className="overflow-y-auto" style={{ maxHeight: '164px' }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-muted-foreground text-center">
                Sonuç bulunamadı.
              </div>
            ) : (
              filtered.map(c => {
                const active = c.id === value
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id)
                      setOpen(false)
                      setQuery('')
                    }}
                    className={[
                      'w-full flex items-center justify-between gap-2',
                      'px-3 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'bg-primary/8 text-primary font-medium'
                        : 'hover:bg-muted/40 text-foreground',
                    ].join(' ')}
                  >
                    <span className="truncate">{c.name}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export function QuickProjectModal({ open, onClose }: Props) {
  const router             = useRouter()
  const [isPending, start] = useTransition()

  // form state
  const [clients,     setClients]     = useState<Client[]>([])
  const [loadingC,    setLoadingC]    = useState(false)
  const [clientId,    setClientId]    = useState('')
  const [title,       setTitle]       = useState('')
  const [fileNo,      setFileNo]      = useState('')
  const [description, setDescription] = useState('')
  const [error,       setError]       = useState('')

  // Load all clients once when modal opens
  useEffect(() => {
    if (!open) return
    setLoadingC(true)
    fetch('/api/clients-list')
      .then(r => r.ok ? r.json() : { clients: [] })
      .then(d => setClients(d.clients ?? []))
      .catch(() => {})
      .finally(() => setLoadingC(false))
  }, [open])

  // Full reset
  function reset() {
    setClientId('')
    setTitle('')
    setFileNo('')
    setDescription('')
    setError('')
    setClients([])
  }

  function handleClose() { reset(); onClose() }

  // ── Submit — builds FormData and calls the existing createProject action ──
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!clientId)       { setError('Lütfen bir müvekkil seçin.'); return }
    if (!title.trim())   { setError('Proje adı zorunludur.'); return }

    // Use typed fileNo or auto-generate (schema requires it, UI makes it optional)
    const resolvedFileNo = fileNo.trim() || genAutoFileNo()

    const fd = new FormData()
    fd.set('clientId',    clientId)
    fd.set('title',       title.trim())
    fd.set('fileNo',      resolvedFileNo)
    if (description.trim()) fd.set('description', description.trim())

    start(async () => {
      const result = await createProject(fd)

      if (!result.success) {
        setError(result.error)
        return
      }

      toast({ title: '✓ Proje oluşturuldu.' })
      handleClose()
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => { if (!v) handleClose() }}
    >
      <DialogContent
        className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-2xl"
        style={{ border: '1px solid hsl(var(--border))' }}
      >
        {/* ── Header ── */}
        <DialogHeader className="flex-row items-center gap-3 px-5 py-4 border-b space-y-0">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <FolderPlus className="h-4 w-4 text-violet-600" />
          </div>
          <DialogTitle className="text-sm font-semibold text-foreground leading-none">
            Hızlı Proje Oluştur
          </DialogTitle>
        </DialogHeader>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          {/* Müvekkil */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Müvekkil <span className="text-red-500">*</span>
            </Label>
            <ClientCombobox
              clients={clients}
              loading={loadingC}
              value={clientId}
              onChange={setClientId}
              disabled={isPending}
            />
          </div>

          {/* Proje Adı */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Proje Adı <span className="text-red-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Örn: İhtarname / Marka Tescil / Dava"
              className="rounded-xl"
              disabled={isPending}
              autoComplete="off"
            />
          </div>

          {/* Dosya / Referans No (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              Dosya / Referans No
              <span className="text-[10px] font-normal text-muted-foreground/60">
                (boş bırakılırsa otomatik atanır)
              </span>
            </Label>
            <Input
              value={fileNo}
              onChange={e => setFileNo(e.target.value)}
              placeholder="Örn: 2025/142"
              className="rounded-xl font-mono text-[13px]"
              disabled={isPending}
              autoComplete="off"
            />
          </div>

          {/* Açıklama (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              Açıklama
              <span className="text-[10px] font-normal text-muted-foreground/60">(opsiyonel)</span>
            </Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Proje hakkında kısa not…"
              className="rounded-xl text-sm min-h-[76px] resize-none"
              disabled={isPending}
            />
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl gap-2"
            >
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor…</>
                : <><FolderPlus className="h-3.5 w-3.5" /> Proje Oluştur</>
              }
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-xl"
            >
              İptal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
