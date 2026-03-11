// src/components/advances/SourceAccountsClient.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createSourceAccount,
  updateSourceAccount,
  deactivateSourceAccount,
  deleteSourceAccount,
} from '@/actions/advances'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { Plus, Pencil, PowerOff, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type Account = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
}

export function SourceAccountsClient({ accounts: initial }: { accounts: Account[] }) {
  const router = useRouter()
  const [accounts, setAccounts] = useState(initial)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createSourceAccount({ name: fd.get('name'), description: fd.get('description') })
      if (!result.success) { setError(result.error); return }
      toast({ title: 'Hesap oluşturuldu.' })
      setCreateOpen(false)
      router.refresh()
    })
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editTarget) return
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateSourceAccount(editTarget.id, { name: fd.get('name'), description: fd.get('description') })
      if (!result.success) { setError(result.error); return }
      toast({ title: 'Hesap güncellendi.' })
      setEditTarget(null)
      router.refresh()
    })
  }

  function handleDeactivate(id: string) {
    startTransition(async () => {
      await deactivateSourceAccount(id)
      toast({ title: 'Hesap pasife alındı.' })
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Bu hesabı silmek istediğinizden emin misiniz? Kullanılmışsa pasife alınacak.')) return
    startTransition(async () => {
      await deleteSourceAccount(id)
      toast({ title: 'İşlem tamamlandı.' })
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">

      {/* Header + create button */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{accounts.length} hesap toplam</p>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); setError('') }}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Yeni Hesap</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm rounded-2xl p-0 gap-0">
            <div className="px-6 py-4 border-b flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <DialogHeader className="space-y-0">
                <DialogTitle className="text-[15px] font-semibold">Yeni Kaynak Hesap</DialogTitle>
              </DialogHeader>
            </div>
            <form onSubmit={handleCreate}>
              <div className="px-6 py-5 space-y-4">
                {error && <p className="text-[13px] text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Hesap Adi *</Label>
                  <Input name="name" required placeholder="Orn: Ziraat TL Hesabi" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Açıklama</Label>
                  <Input name="description" placeholder="Opsiyonel..." className="rounded-xl" />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setCreateOpen(false)}>İptal</Button>
                <Button type="submit" disabled={isPending} className="rounded-xl gap-2">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Oluştur
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Account list */}
      <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
        {initial.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">Henüz hesap yok.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {initial.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/15 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${acc.isActive ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{acc.name}</p>
                    {acc.description && <p className="text-[11px] text-muted-foreground">{acc.description}</p>}
                  </div>
                  {!acc.isActive && (
                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Pasif</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg hover:bg-muted"
                    onClick={() => { setEditTarget(acc); setError('') }}
                    title="Düzenle"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {acc.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg hover:bg-orange-50 text-orange-500"
                      onClick={() => handleDeactivate(acc.id)}
                      disabled={isPending}
                      title="Pasife Al"
                    >
                      <PowerOff className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 text-red-500"
                    onClick={() => handleDelete(acc.id)}
                    disabled={isPending}
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); setError('') }}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-0 gap-0">
          <div className="px-6 py-4 border-b flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-[15px] font-semibold">Hesabı Düzenle</DialogTitle>
            </DialogHeader>
          </div>
          <form onSubmit={handleEdit}>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-[13px] text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              <div className="space-y-1.5">
                <Label className="text-[13px]">Hesap Adi *</Label>
                <Input name="name" required defaultValue={editTarget?.name ?? ''} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Açıklama</Label>
                <Input name="description" defaultValue={editTarget?.description ?? ''} className="rounded-xl" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
              <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setEditTarget(null)}>İptal</Button>
              <Button type="submit" disabled={isPending} className="rounded-xl gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                Kaydet
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
