// src/components/transactions/AddExpenseModal.tsx
'use client'
import React, { useState, useTransition } from 'react'
import { createExpense } from '@/actions/transactions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Dropzone, type UploadedFile } from '@/components/ui/dropzone'
import { MinusCircle, Receipt, Calendar, DollarSign, FileText, Tag } from 'lucide-react'

interface Props {
  clientId: string
  projects: { id: string; fileNo: string; title: string }[]
  isAdmin: boolean
}

const CATEGORIES = [
  { value: 'COURT_FEES',  label: 'Mahkeme Harçları' },
  { value: 'TRAVEL',      label: 'Seyahat' },
  { value: 'NOTARY',      label: 'Noter' },
  { value: 'SHIPPING',    label: 'Kargo / Posta' },
  { value: 'TAX',         label: 'Vergi' },
  { value: 'OFFICE',      label: 'Ofis Gideri' },
  { value: 'OTHER',       label: 'Diğer' },
]

const PAYMENT_METHODS = [
  { value: 'TRANSFER', label: 'Havale / EFT' },
  { value: 'CASH',     label: 'Nakit' },
  { value: 'CARD',     label: 'Kart' },
]

function FieldRow({ label, icon: Icon, children }: { label: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      {children}
    </div>
  )
}

export function AddExpenseModal({ clientId, projects, isAdmin }: Props) {
  const [open, setOpen]              = useState(false)
  const [error, setError]            = useState('')
  const [isPending, startTransition] = useTransition()
  const [category, setCategory]      = useState('COURT_FEES')
  const [paymentMethod, setMethod]   = useState('TRANSFER')
  const [projectId, setProjectId]    = useState<string | undefined>(undefined)
  const [forceNegative, setForceNeg] = useState(false)
  const [uploadedFiles, setFiles]    = useState<UploadedFile[]>([])
  const [uploading, setUploading]    = useState(false)

  function resetState() {
    setError('')
    setProjectId(undefined)
    setForceNeg(false)
    setFiles([])
    setCategory('COURT_FEES')
    setMethod('TRANSFER')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const normalizedProjectId = projectId === 'NONE' ? undefined : projectId

      const result = await createExpense({
        clientId,
        projectId:     normalizedProjectId,
        amount:        fd.get('amount'),
        date:          fd.get('date'),
        description:   fd.get('description'),
        category,
        paymentMethod,
        vatIncluded:   fd.get('vatIncluded') === 'on',
        vatRate:       fd.get('vatRate') || 0,
        invoiceNo:     fd.get('invoiceNo'),
        invoiced:      fd.get('invoiced') === 'on',
        forceNegative: isAdmin && forceNegative,
        attachmentMeta: uploadedFiles.map((f) => ({
          storageKey: f.storageKey, originalName: f.originalName, mimeType: f.mimeType, sizeBytes: f.sizeBytes,
        })),
      })

      if (!result.success) {
        setError(result.error)
      } else {
        toast({ title: 'Harcama kaydedildi.' })
        setOpen(false)
        resetState()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState() }}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl">
          <MinusCircle className="h-4 w-4" />
          Harcama Ekle
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <Receipt className="h-4 w-4 text-orange-600" />
          </div>
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-[15px] font-semibold">Harcama Ekle</DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-xl px-3.5 py-2.5 text-sm bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* Row 1: Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Tutar (TRY) *" icon={DollarSign}>
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                className="rounded-xl tabular-nums"
              />
            </FieldRow>
            <FieldRow label="Tarih *" icon={Calendar}>
              <Input
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="rounded-xl"
              />
            </FieldRow>
          </div>

          {/* Row 2: Project */}
          <FieldRow label="Proje">
            <Select value={projectId ?? ''} onValueChange={setProjectId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Proje seçin (opsiyonel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">— Genel (projeye bağlı değil)</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-medium">{p.title}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">{p.fileNo}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Row 3: Category + Payment */}
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Kategori" icon={Tag}>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Ödeme Yöntemi">
              <Select value={paymentMethod} onValueChange={setMethod}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          {/* Row 4: Description */}
          <FieldRow label="Açıklama" icon={FileText}>
            <Input name="description" placeholder="Opsiyonel açıklama..." className="rounded-xl" />
          </FieldRow>

          {/* Row 5: Drag & Drop File Upload */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Fiş / Belge Eki
            </label>
            <Dropzone
              files={uploadedFiles}
              onFilesChange={setFiles}
              uploading={uploading}
              onUploadingChange={setUploading}
            />
          </div>

          {/* Admin: force negative */}
          {isAdmin && (
            <label className="flex items-center gap-2 cursor-pointer text-[12px] text-muted-foreground">
              <input
                type="checkbox"
                checked={forceNegative}
                onChange={(e) => setForceNeg(e.target.checked)}
                className="rounded"
              />
              Negatif bakiyeye zorla (Admin)
            </label>
          )}

          {/* Footer */}
          <div className="flex gap-2 pt-1 border-t">
            <Button
              type="submit"
              disabled={isPending || uploading}
              className="flex-1 rounded-xl mt-4"
            >
              {isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl mt-4"
            >
              İptal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
