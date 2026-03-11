"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateProject, toggleProjectClosed, deleteProject } from "@/actions/projects"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Pencil, Loader2, Lock, LockOpen, Trash2 } from "lucide-react"

type Project = {
  id: string
  fileNo: string
  title: string
  description: string | null
  closedAt: Date | null
}

export function EditProjectModal({
  project,
  isAdmin,
}: {
  project: Project
  isAdmin: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await updateProject(project.id, {
        fileNo: String(fd.get("fileNo") ?? "").trim(),
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || undefined,
      })

      if (!res.success) {
        setError(res.error)
      } else {
        toast({ title: "Proje güncellendi." })
        setOpen(false)
        router.refresh()
      }
    })
  }

  function handleToggleClosed() {
    setError("")
    startTransition(async () => {
      const res = await toggleProjectClosed(project.id)
      if (!res.success) {
        setError(res.error)
      } else {
        toast({ title: project.closedAt ? "Proje yeniden açıldı." : "Proje kapatıldı." })
        setOpen(false)
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setError("")
    startTransition(async () => {
      const res = await deleteProject(project.id)
      if (!res.success) {
        setError(res.error)
        setConfirmDelete(false)
      } else {
        toast({ title: "Proje silindi." })
        setOpen(false)
        router.back()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(""); setConfirmDelete(false) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl">
          <Pencil className="h-3.5 w-3.5" />
          Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 gap-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Pencil className="h-4 w-4 text-primary" />
          </div>
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-[15px] font-semibold">Proje Düzenle</DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl px-3.5 py-2.5 text-sm bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Dosya No *
            </Label>
            <Input
              name="fileNo"
              required
              defaultValue={project.fileNo}
              placeholder="2024/001"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Başlık *
            </Label>
            <Input
              name="title"
              required
              defaultValue={project.title}
              placeholder="Proje başlığı"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Açıklama
            </Label>
            <textarea
              name="description"
              rows={3}
              defaultValue={project.description ?? ""}
              placeholder="Opsiyonel açıklama..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-border rounded-xl outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all resize-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex gap-2 pt-1 border-t">
            <Button type="submit" disabled={isPending} className="flex-1 rounded-xl mt-4">
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Kaydediliyor...</> : "Kaydet"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl mt-4">
              İptal
            </Button>
          </div>
        </form>

        {isAdmin && (
          <div className="px-6 pb-5 space-y-2 border-t pt-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Yönetici İşlemleri
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleToggleClosed}
                className="gap-2 rounded-xl flex-1"
              >
                {project.closedAt ? (
                  <><LockOpen className="h-3.5 w-3.5" /> Yeniden Aç</>
                ) : (
                  <><Lock className="h-3.5 w-3.5" /> Projeyi Kapat</>
                )}
              </Button>

              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "outline"}
                size="sm"
                disabled={isPending}
                onClick={handleDelete}
                className="gap-2 rounded-xl flex-1"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><Trash2 className="h-3.5 w-3.5" /> {confirmDelete ? "Emin misiniz?" : "Sil"}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
