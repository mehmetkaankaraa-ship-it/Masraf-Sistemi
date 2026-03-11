'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createUser } from '@/actions/admin'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { UserPlus, Eye, EyeOff } from 'lucide-react'

export function AddUserModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER')
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createUser({
        name:     fd.get('name'),
        email:    fd.get('email'),
        password: fd.get('password'),
        role,
      })

      if (!result.success) {
        setError(result.error)
      } else {
        toast({ title: 'Kullanıcı oluşturuldu.' })
        setOpen(false)
        setError('')
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError('') }}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl">
          <UserPlus className="h-4 w-4" />
          Kullanıcı Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 gap-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-primary" />
          </div>
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-[15px] font-semibold">Yeni Kullanıcı</DialogTitle>
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
            <Input name="name" required placeholder="Ahmet Yılmaz" className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">E-posta *</Label>
            <Input name="email" type="email" required placeholder="ahmet@firma.com" className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Şifre *</Label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="En az 6 karakter"
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
              {isPending ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl mt-4">
              İptal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
