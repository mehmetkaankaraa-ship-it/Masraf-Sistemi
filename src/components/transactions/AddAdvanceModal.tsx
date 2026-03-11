// src/components/transactions/AddAdvanceModal.tsx
'use client'
import { useState, useTransition } from 'react'
import { createAdvance } from '@/actions/transactions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { PlusCircle } from 'lucide-react'

interface Props {
  clientId: string
  projects: { id: string; fileNo: string; title: string }[]
  /** Passed through but not used inside — kept for consistent prop interface */
  isAdmin: boolean
}

export function AddAdvanceModal({ clientId, projects }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [projectId, setProjectId] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createAdvance({
        clientId,
        projectId: projectId || undefined,
        amount: fd.get('amount'),
        date:   fd.get('date'),
        description: fd.get('description'),
      })

      if (!result.success) {
        setError(result.error)
      } else {
        toast({ title: 'Avans kaydedildi.' })
        setOpen(false)
        // Reset form state
        setProjectId('')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setProjectId('') }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Avans Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avans Ekle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="adv-amount">Tutar (TRY) *</Label>
            <Input
              id="adv-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adv-date">Tarih *</Label>
            <Input
              id="adv-date"
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
            <Label htmlFor="adv-description">Açıklama</Label>
            <Input
              id="adv-description"
              name="description"
              placeholder="İsteğe bağlı not..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

