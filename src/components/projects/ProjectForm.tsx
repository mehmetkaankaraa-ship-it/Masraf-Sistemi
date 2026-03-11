// src/components/projects/ProjectForm.tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/actions/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'

export function ProjectForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('clientId', clientId)

    startTransition(async () => {
      const result = await createProject(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        toast({ title: 'Proje oluşturuldu.' })
        router.push(`/projects/${result.data.id}`)
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
      <input type="hidden" name="clientId" value={clientId} />

      <div className="space-y-2">
        <Label htmlFor="fileNo">Dosya Numarası *</Label>
        <Input id="fileNo" name="fileNo" required placeholder="2024/001" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Başlık *</Label>
        <Input id="title" name="title" required placeholder="İş Davası - İstanbul" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Açıklama</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Kaydediliyor...' : 'Proje Oluştur'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          İptal
        </Button>
      </div>
    </form>
  )
}
