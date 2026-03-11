'use client'

import React, { useEffect, useRef, useState, useTransition } from 'react'
import { updateTransaction } from '@/actions/transactions'
import { getAttachmentUrl } from '@/lib/attachment-url'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Pencil, Paperclip, Trash2 } from 'lucide-react'
import { deleteAttachment } from '@/actions/transactions'

type Tx = {
  id: string
  type: 'ADVANCE' | 'EXPENSE' | 'REFUND'
  amount: string | number
  date: Date | string
  description: string | null
  project: { id: string; title: string } | null
  attachments: { id: string; originalName: string; storageKey: string }[]
}

type UploadedMeta = {
  storageKey: string
  originalName: string
  mimeType: string
  sizeBytes: number
  url?: string
}

export function EditTransactionModal({
  tx,
  clientId,
  projects,
  canEdit,
  asMenuItem = false,
}: {
  tx: Tx
  asMenuItem?: boolean
  clientId: string
  projects: { id: string; title: string }[]
  canEdit: boolean
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [amount, setAmount] = useState(String(tx.amount))
  const [date, setDate] = useState(new Date(tx.date).toISOString().slice(0, 10))
  const [description, setDescription] = useState(tx.description ?? '')
  const [projectId, setProjectId] = useState<string>(tx.project?.id ?? '')
  const [newAttachments, setNewAttachments] = useState<UploadedMeta[]>([])

  useEffect(() => {
    if (!open) return
    setAmount(String(tx.amount))
    setDate(new Date(tx.date).toISOString().slice(0, 10))
    setDescription(tx.description ?? '')
    setProjectId(tx.project?.id ?? '')
    setNewAttachments([])
  }, [open, tx])

  async function uploadOne(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/uploads/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setNewAttachments((prev) => [
        ...prev,
        {
          storageKey: json.storageKey,
          originalName: file.name,
          mimeType: json.mimeType,
          sizeBytes: json.sizeBytes,
          url: json.url,
        },
      ])
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      await uploadOne(f)
      toast({ title: 'Belge yüklendi.' })
    } catch (err: any) {
      toast({ title: err?.message || 'Dosya yüklenemedi.', variant: 'destructive' })
    }
  }

  function submit() {
    startTransition(async () => {
      const result = await updateTransaction({
        id: tx.id,
        clientId,
        amount,
        date,
        description: description || undefined,
        projectId: tx.type === 'EXPENSE' ? (projectId || undefined) : undefined,
        attachmentMeta: newAttachments.map((a) => ({
          storageKey: a.storageKey, originalName: a.originalName, mimeType: a.mimeType, sizeBytes: a.sizeBytes,
        })),
      })

      if (!result.success) {
        toast({ title: result.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Kayıt güncellendi.' })
      setOpen(false)
    })
  }

  async function removeExistingAttachment(attachmentId: string) {
    if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return
    const r = await deleteAttachment(attachmentId)
    if (!r.success) toast({ title: r.error, variant: 'destructive' })
    else toast({ title: 'Belge silindi.' })
  }

  if (!canEdit) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {asMenuItem ? (
          <button className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-accent transition-colors">
            <Pencil className="h-3.5 w-3.5" />
            Düzenle
          </button>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Düzenle">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Pencil className="h-4 w-4 text-primary" />
          </div>
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-[15px] font-semibold">İşlem Düzenle</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tutar (TRY) *</Label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl tabular-nums" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tarih *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
          </div>

          {tx.type === 'EXPENSE' && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Proje *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Proje seçin" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Açıklama</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl" placeholder="Opsiyonel..." />
          </div>

          {/* Existing attachments */}
          {tx.attachments.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Mevcut Belgeler</Label>
              <div className="space-y-1.5">
                {tx.attachments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-white border rounded-xl">
                    <a className="text-[12px] truncate text-foreground hover:text-primary hover:underline transition-colors" href={getAttachmentUrl(a.storageKey)} target="_blank" rel="noreferrer">
                      {a.originalName}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeExistingAttachment(a.id)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New attachment */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Yeni Belge Ekle</Label>
            <div className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[12px] text-muted-foreground">
                {uploading ? 'Yükleniyor...' : 'Dosya seç (PDF, JPG, PNG)'}
              </span>
              <input ref={fileRef} type="file" onChange={onPickFile} className="hidden" />
            </div>
          </div>

          <div className="flex gap-2 pt-1 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl mt-4">
              İptal
            </Button>
            <Button type="button" onClick={submit} disabled={isPending || uploading} className="flex-1 rounded-xl mt-4">
              {isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}