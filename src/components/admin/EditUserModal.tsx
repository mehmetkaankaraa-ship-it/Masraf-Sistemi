'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateUser, toggleUserActive } from '@/actions/admin'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Pencil, Eye, EyeOff, Loader2, PowerOff, Power } from 'lucide-react'

type UserRow = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
}

export function EditUserModal({ user }: { user: UserRow }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState<'USER' | 'ADMIN'>(user.role)
  const [showPassword, setShowPassword] = useState(false)
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await updateUser(user.id, {
        name: fd.get('name'),
        email: fd.get('email'),
        role,
        password: fd.get('password') || undefined,
      })

      if (!res.success) {
        setError(res.error)
      } else {
        toast({ title: 'Kullanıcı güncellendi.' })
        setOpen(false)
        router.refresh()
      }
    })
  }

  function handleToggleActive() {
    setError('')
    startTransition(async () => {
      const res = await toggleUserActive(user.id)
      if (!res.success) {
        setError(res.error)
      } else {
        toast({ title: user.isActive ? 'Hesap devre dışı bırakıldı.' : 'Hesap aktifleştirildi.' })
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError('') }}>
      <DialogTrigger asChild>
        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 gap-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Pencil className="h-4 w-4 text-primary" />
          </div>
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-[15px] font-semibold">Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl px-3.5 py-2.5 text-sm bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Ad Soyad *</Label>
            <Input name="name" required defaultValue={user.name} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">E-posta *</Label>
            <Input name="email" type="email" required defaultValue={user.email} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Yeni Şifre <span className="normal-case text-muted-foreground/70">(boş bırakırsan değişmez)</span>
            </Label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Değiştirmek için girin"
                className="rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'USER' | 'ADMIN')}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">Kullanıcı (User)</SelectItem>
                <SelectItem value="ADMIN">Yönetici (Admin)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-1 border-t">
            <Button type="submit" disabled={isPending} className="flex-1 rounded-xl mt-4">
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Kaydediliyor...</> : 'Kaydet'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl mt-4">
              İptal
            </Button>
          </div>
        </form>

        <div className="px-6 pb-5 border-t pt-4 space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleToggleActive}
            className={`w-full rounded-xl gap-2 ${user.isActive ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : user.isActive ? (
              <><PowerOff className="h-3.5 w-3.5" />Hesabı Devre Dışı Bırak</>
            ) : (
              <><Power className="h-3.5 w-3.5" />Hesabı Aktifleştir</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
