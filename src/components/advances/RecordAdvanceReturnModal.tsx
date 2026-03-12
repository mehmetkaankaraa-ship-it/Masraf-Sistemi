'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAdvanceReturn } from '@/actions/advances'
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
import { ArrowDownLeft, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  employeeId:   string
  employeeName: string
}

export function RecordAdvanceReturnModal({ employeeId, employeeName }: Props) {
  const router             = useRouter()
  const [open, setOpen]    = useState(false)
  const [isPending, start] = useTransition()
  const [error, setError]  = useState('')

  function handleClose() {
    if (isPending) return
    setError('')
    setOpen(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd     = new FormData(e.currentTarget)
    const amount = fd.get('amount')
    const date   = fd.get('date')
    const note   = String(fd.get('note') ?? '').trim()

    start(async () => {
      const result = await createAdvanceReturn({
        employeeId,
        amount,
        date,
        note: note || undefined,
      })
      if (!result.success) { setError(result.error); return }
      toast({ title: '✓ Avans iadesi kaydedildi.' })
      handleClose()
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 rounded-xl text-emerald-700 border-emerald-200 hover:bg-emerald-50"
      >
        <ArrowDownLeft className="h-3.5 w-3.5" />
        Avans İadesi Kaydet
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden rounded-2xl">

          {/* Header */}
          <DialogHeader className="flex-row items-center gap-3 px-5 py-4 border-b space-y-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            </div>
            <DialogTitle className="text-sm font-semibold text-foreground leading-none">
              Avans İadesi — {employeeName}
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
                İade Tutarı (₺) <span className="text-red-500">*</span>
              </Label>
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                className="rounded-xl"
                disabled={isPending}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Tarih <span className="text-red-500">*</span>
              </Label>
              <Input
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="rounded-xl"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Not
                <span className="text-[10px] font-normal text-muted-foreground/60">(opsiyonel)</span>
              </Label>
              <Textarea
                name="note"
                placeholder="İade hakkında kısa açıklama…"
                className="rounded-xl text-sm min-h-[64px] resize-none"
                disabled={isPending}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={isPending} className="flex-1 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700">
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor…</>
                  : <><ArrowDownLeft className="h-3.5 w-3.5" /> İadeyi Kaydet</>
                }
              </Button>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending} className="rounded-xl">
                İptal
              </Button>
            </div>
          </form>

        </DialogContent>
      </Dialog>
    </>
  )
}
