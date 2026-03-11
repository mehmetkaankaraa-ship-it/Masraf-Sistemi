// src/components/clients/ClientForm.tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'

export function ClientForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createClient(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        toast({ title: 'Müvekkil oluşturuldu.' })
        router.push(`/clients/${result.data.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Ad Soyad / Şirket Adı *</Label>
        <Input id="name" name="name" required placeholder="Ahmet Yılmaz" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" placeholder="+90 555 000 0000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" name="email" type="email" placeholder="ornek@email.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="taxId">TC/Vergi No</Label>
        <Input id="taxId" name="taxId" placeholder="12345678901" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Adres</Label>
        <Textarea id="address" name="address" rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notlar</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Kaydediliyor...' : 'Müvekkil Oluştur'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          İptal
        </Button>
      </div>
    </form>
  )
}
