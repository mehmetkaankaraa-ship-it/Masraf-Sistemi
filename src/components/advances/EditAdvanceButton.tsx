'use client'

import { useState, useTransition, useEffect } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { updateAdvance, listSourceAccounts } from '@/actions/advances'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type SourceAccount = { id: string; name: string; isActive: boolean }

interface Props {
  id: string
  defaultAmount: number
  defaultDate: string   // YYYY-MM-DD
  defaultNote: string | null
  defaultSourceAccountId: string | null
}

export function EditAdvanceButton({ id, defaultAmount, defaultDate, defaultNote, defaultSourceAccountId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [accounts, setAccounts] = useState<SourceAccount[]>([])
  const [sourceAccountId, setSourceAccountId] = useState(defaultSourceAccountId ?? '')

  useEffect(() => {
    if (open) {
      setSourceAccountId(defaultSourceAccountId ?? '')
      listSourceAccounts(false).then(setAccounts).catch(() => setAccounts([]))
    }
  }, [open, defaultSourceAccountId])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateAdvance(id, {
        amount:          fd.get('amount'),
        date:            fd.get('date'),
        note:            fd.get('note') || null,
        sourceAccountId: sourceAccountId || null,
      })

      if (!result.success) {
        setError(result.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError('') }}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors"
          title="Transferi düzenle"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-2xl p-0 gap-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Pencil className="h-4 w-4 text-violet-600" />
          </div>
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-[15px] font-semibold">Transferi Düzenle</DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-[13px] text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`amount-${id}`} className="text-[13px] font-medium">Tutar (TRY) *</Label>
              <Input
                id={`amount-${id}`}
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={defaultAmount}
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`date-${id}`} className="text-[13px] font-medium">Tarih *</Label>
              <Input
                id={`date-${id}`}
                name="date"
                type="date"
                defaultValue={defaultDate}
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Kaynak Hesap</Label>
              <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Hesap seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Yok —</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`note-${id}`} className="text-[13px] font-medium">Not (opsiyonel)</Label>
              <Input
                id={`note-${id}`}
                name="note"
                defaultValue={defaultNote ?? ''}
                placeholder="Açıklama..."
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2 rounded-xl bg-violet-600 hover:bg-violet-700">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
