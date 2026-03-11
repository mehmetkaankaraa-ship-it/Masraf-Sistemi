'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/actions/clients'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast }    from '@/components/ui/use-toast'
import { UserPlus, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function QuickClientModal({ open, onClose }: Props) {
  const router             = useRouter()
  const [isPending, start] = useTransition()
  const [error, setError]  = useState('')

  function handleClose() {
    if (isPending) return
    setError('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd    = new FormData(e.currentTarget)
    const name  = String(fd.get('name') ?? '').trim()
    const notes = String(fd.get('notes') ?? '').trim()
    if (!name) { setError('Müvekkil adı zorunludur.'); return }

    start(async () => {
      const result = await createClient({ name, notes: notes || undefined })
      if (!result.success) { setError(result.error); return }
      toast({ title: '✓ Müvekkil oluşturuldu.' })
      handleClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden rounded-2xl">

        {/* Header */}
        <DialogHeader className="flex-row items-center gap-3 px-5 py-4 border-b space-y-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <UserPlus className="h-4 w-4 text-blue-600" />
          </div>
          <DialogTitle className="text-sm font-semibold text-foreground leading-none">
            Hızlı Müvekkil Ekle
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Müvekkil Adı <span className="text-red-500">*</span>
            </Label>
            <Input
              name="name"
              required
              placeholder="Örn: Ahmet Yılmaz veya ABC A.Ş."
              className="rounded-xl"
              disabled={isPending}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              Notlar
              <span className="text-[10px] font-normal text-muted-foreground/60">(opsiyonel)</span>
            </Label>
            <Textarea
              name="notes"
              placeholder="Müvekkil hakkında kısa not…"
              className="rounded-xl text-sm min-h-[72px] resize-none"
              disabled={isPending}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} className="flex-1 rounded-xl gap-2">
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor…</>
                : <><UserPlus className="h-3.5 w-3.5" /> Müvekkil Ekle</>
              }
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending} className="rounded-xl">
              İptal
            </Button>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  )
}
