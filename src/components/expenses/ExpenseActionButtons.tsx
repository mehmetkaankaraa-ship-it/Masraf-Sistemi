'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitExpense, approveExpense, rejectExpense } from '@/actions/transactions'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Loader2, Send, CheckCircle, XCircle } from 'lucide-react'

type Props = {
  id: string
  status: string | null
  isOwner: boolean
  isAdmin: boolean
}

export function ExpenseActionButtons({ id, status, isOwner, isAdmin }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  function handleSubmit() {
    startTransition(async () => {
      const res = await submitExpense(id)
      if (res.success) {
        toast({ title: 'Gider onaya gönderildi.' })
        router.refresh()
      } else {
        toast({ title: res.error, variant: 'destructive' })
      }
    })
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveExpense(id)
      if (res.success) {
        toast({ title: 'Gider onaylandı.' })
        router.refresh()
      } else {
        toast({ title: res.error, variant: 'destructive' })
      }
    })
  }

  function handleReject() {
    if (!showRejectInput) { setShowRejectInput(true); return }
    startTransition(async () => {
      const res = await rejectExpense(id, rejectReason)
      if (res.success) {
        toast({ title: 'Gider reddedildi.' })
        setShowRejectInput(false)
        router.refresh()
      } else {
        toast({ title: res.error, variant: 'destructive' })
      }
    })
  }

  if (status === 'DRAFT' && isOwner) {
    return (
      <Button size="sm" variant="outline" disabled={isPending} onClick={handleSubmit}
        className="h-7 px-2 text-[11px] gap-1 rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50">
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        Onaya Gönder
      </Button>
    )
  }

  if (status === 'SUBMITTED' && isAdmin) {
    return (
      <div className="flex items-center gap-1">
        {showRejectInput ? (
          <>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Red sebebi..."
              className="h-7 px-2 text-[11px] border rounded-lg outline-none focus:border-primary/60 w-28"
            />
            <Button size="sm" variant="destructive" disabled={isPending} onClick={handleReject}
              className="h-7 px-2 text-[11px] gap-1 rounded-lg">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reddet'}
            </Button>
            <button onClick={() => setShowRejectInput(false)} className="text-[11px] text-muted-foreground hover:text-foreground">İptal</button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" disabled={isPending} onClick={handleApprove}
              className="h-7 px-2 text-[11px] gap-1 rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Onayla
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={handleReject}
              className="h-7 px-2 text-[11px] gap-1 rounded-lg text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="h-3 w-3" />
              Reddet
            </Button>
          </>
        )}
      </div>
    )
  }

  return null
}
