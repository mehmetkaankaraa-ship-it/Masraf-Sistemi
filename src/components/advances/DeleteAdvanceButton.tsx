'use client'

import { useState, useTransition } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { deleteAdvance } from '@/actions/advances'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  receiverName: string
  amount: string // pre-formatted
}

export function DeleteAdvanceButton({ id, receiverName, amount }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteAdvance(id)
      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error ?? 'Bir hata oluştu.')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Transferi sil"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => !isPending && setOpen(false)} />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Transferi Sil</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">{receiverName}</span> adına{' '}
                  <span className="font-semibold text-emerald-600">{amount}</span> tutarındaki avans transferi kalıcı olarak silinecek. Bu işlem geri alınamaz.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-[13px] font-medium text-foreground bg-muted/40 rounded-xl hover:bg-muted/70 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-[13px] font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Siliniyor…' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
