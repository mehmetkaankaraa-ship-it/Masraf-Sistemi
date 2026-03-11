"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Proje oluşturan action — sende zaten var
import { createProject } from "@/actions/projects"

function genAutoFileNo() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `PRJ-${yyyy}${mm}${dd}-${hh}${mi}${ss}`
}

export default function CreateProjectModal({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setTitle("")
    setMsg(null)
  }

  async function onSubmit() {
    setMsg(null)
    const name = title.trim()
    if (!name) {
      setMsg("Proje ismi zorunlu.")
      return
    }

    startTransition(async () => {
      try {
        // ✅ Action FormData bekliyor, o yüzden FormData gönderiyoruz
        const fd = new FormData()
        fd.set("clientId", clientId)
        fd.set("title", name)

        // Sistem zorunlu tutuyorsa diye otomatik fileNo
        fd.set("fileNo", genAutoFileNo())

        // description vb. göndermiyoruz (gereksiz)
        const res: any = await createProject(fd)

        if (!res?.success) throw new Error(res?.error || "Proje eklenemedi.")

        setOpen(false)
        reset()
        router.refresh()
      } catch (e: any) {
        setMsg(e?.message || "Proje eklenemedi.")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-black text-white hover:opacity-90">
          + Proje Ekle
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Yeni Proje</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {msg ? (
            <div className="rounded-md border bg-red-50 px-3 py-2 text-sm">
              {msg}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Proje İsmi</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: İhtarname / Marka / Dava"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Vazgeç
            </Button>
            <Button type="button" onClick={onSubmit} disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}