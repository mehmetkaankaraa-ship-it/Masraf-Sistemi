// src/components/admin/SendAdvanceModal.tsx
'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { createEmployeeAdvanceTransfer } from '@/actions/advances'
import { ArrowUpRight, X } from 'lucide-react'

interface Employee { id: string; name: string }
interface SourceAccount { id: string; name: string; description?: string | null }

interface Props {
  employees: Employee[]
  sourceAccounts: SourceAccount[]
  defaultEmployeeId?: string
}

const today = () => new Date().toISOString().slice(0, 10)

export function SendAdvanceModal({ employees, sourceAccounts, defaultEmployeeId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [receivedById,    setReceivedById]    = useState(defaultEmployeeId ?? '')
  const [sourceAccountId, setSourceAccountId] = useState(sourceAccounts[0]?.id ?? '')
  const [amount,          setAmount]          = useState('')
  const [date,            setDate]            = useState(today())
  const [note,            setNote]            = useState('')

  async function handleSubmit() {
    if (!receivedById || !sourceAccountId || !amount || !date) {
      toast({ title: 'Hata', description: 'Tüm zorunlu alanları doldurun.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const res = await createEmployeeAdvanceTransfer({ receiverId: receivedById, sourceAccountId, amount: Number(amount), date, note })
    setLoading(false)
    if (!res.success) {
      toast({ title: 'Hata', description: res.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Avans gönderildi', description: 'Transfer başarıyla kaydedildi.' })
    setOpen(false)
    setAmount('')
    setNote('')
    setDate(today())
  }

  const inputCls = 'w-full border rounded-xl px-3 py-2 text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'
  const labelCls = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-[13px] font-medium rounded-xl hover:opacity-90 transition-all shadow-sm"
      >
        <ArrowUpRight className="h-3.5 w-3.5" />Avans Gönder
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4 text-violet-600" />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">Avans Gönder</h2>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              {!defaultEmployeeId && (
                <div>
                  <label className={labelCls}>Çalışan *</label>
                  <select value={receivedById} onChange={e => setReceivedById(e.target.value)} className={inputCls}>
                    <option value="">Çalışan seçin...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Kaynak Hesap *</label>
                <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className={inputCls}>
                  <option value="">Hesap secin...</option>
                  {sourceAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Açıklama..." className={`${inputCls} resize-none`} />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-violet-600 text-white text-[13px] font-medium py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {loading ? 'Kaydediliyor...' : 'Avans Gönder'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 text-[13px] font-medium text-muted-foreground border rounded-xl hover:bg-muted transition-all"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
