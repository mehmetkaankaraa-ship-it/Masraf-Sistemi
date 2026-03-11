// src/components/transactions/AddRefundModal.tsx
'use client'
import { useState, useTransition } from 'react'
import { createRefund } from '@/actions/transactions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Undo2 } from 'lucide-react'

interface Props {
  clientId: string
  projects: { id: string; fileNo: string; title: string }[]
  isAdmin: boolean
}

export function AddRefundModal({ clientId, projects, isAdmin }: Props) {
  const [open, setOpen]              = useState(false)
  const [error, setError]            = useState('')
  const [isPending, startTransition] = useTransition()
  const [projectId, setProjectId]    = useState('')
  const [forceNegative, setForceNeg] = useState(false)

  function resetState() {
    setError('')
    setProjectId('')
    setForceNeg(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createRefund({
        clientId,
        projectId:     projectId || undefined,
        amount:        fd.get('amount'),
        date:          fd.get('date'),
        description:   fd.get('description'),
        forceNegative: isAdmin && forceNegative,
      })

      if (!result.success) {
        setError(result.error)
      } else {
        toast({ title: 'İade kaydedildi.' })
        setOpen(false)
        resetState()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState() }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Undo2 className="h-4 w-4" />
          İade Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>İade Ekle</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Müvekkile kalan bakiyeden para iadesi yapılacaktır. Bu işlem bakiyeyi azaltır.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ref-amount">Tutar (TRY) *</Label>
            <Input
              id="ref-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref-date">Tarih *</Label>
            <Input
              id="ref-date"
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>

          {projects.length > 0 && (
            <div className="space-y-2">
              <Label>Proje (opsiyonel)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Proje seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Genel (proje bağlantısı yok)</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ref-description">Açıklama</Label>
            <Input
              id="ref-description"
              name="description"
              placeholder="İade sebebi veya notu..."
            />
          </div>

          {/* Admin-only negative balance override */}
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm cursor-pointer text-amber-600">
              <input
                type="checkbox"
                checked={forceNegative}
                onChange={(e) => setForceNeg(e.target.checked)}
                className="rounded"
              />
              ⚠️ Negatif bakiyeye izin ver (Admin yetkisi)
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'Kaydediliyor...' : 'İadeyi Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
