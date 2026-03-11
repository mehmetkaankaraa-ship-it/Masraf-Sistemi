// src/components/admin/NewTransferForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { createEmployeeAdvanceTransfer } from '@/actions/advances'
import { ArrowUpRight } from 'lucide-react'

interface Employee { id: string; name: string }
interface SourceAccount { id: string; name: string; description?: string | null }

interface Props {
  employees: Employee[]
  sourceAccounts: SourceAccount[]
}

export function NewTransferForm({ employees, sourceAccounts }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const [receivedById,    setReceivedById]    = useState(employees[0]?.id ?? '')
  const [sourceAccountId, setSourceAccountId] = useState(sourceAccounts[0]?.id ?? '')
  const [amount,          setAmount]          = useState('')
  const [date,            setDate]            = useState(today)
  const [note,            setNote]            = useState('')

  async function handleSubmit() {
    if (!receivedById || !sourceAccountId || !amount || !date) {
      toast({ title: 'Hata', description: 'Tüm zorunlu alanları doldurun.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const res = await createEmployeeAdvanceTransfer({ receiverId: receivedById, sourceAccountId, amount: Number(amount), date, note })
    setLoading(false)
    if (!res.success) { toast({ title: 'Hata', description: res.error, variant: 'destructive' }); return }
    toast({ title: 'Avans gönderildi', description: 'Transfer başarıyla kaydedildi.' })
    router.push(`/admin/users/${receivedById}`)
  }

  const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'
  const labelCls = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block'

  return (
    <div className="bg-white rounded-2xl border card-shadow p-6 space-y-5">
      <div>
        <label className={labelCls}>Çalışan *</label>
        <select value={receivedById} onChange={e => setReceivedById(e.target.value)} className={inputCls}>
          {employees.length === 0 && <option value="">Çalışan yok</option>}
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Kaynak Hesap *</label>
        <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className={inputCls}>
          {sourceAccounts.length === 0 && <option value="">Hesap yok</option>}
          {sourceAccounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.description ? ` - ${a.description}` : ''}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Tutar (TRY) *</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tarih *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Not (opsiyonel)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Açıklama veya referans..." className={`${inputCls} resize-none`} />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white text-[13px] font-medium py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all"
        >
          <ArrowUpRight className="h-4 w-4" />
          {loading ? 'Kaydediliyor...' : 'Avans Gönder'}
        </button>
      </div>
    </div>
  )
}
