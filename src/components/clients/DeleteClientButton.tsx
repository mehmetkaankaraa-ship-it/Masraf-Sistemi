"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteClient } from "@/actions/clients"
import { Trash2, Loader2 } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export function DeleteClientButton({
  clientId,
  clientName,
  projectCount,
}: {
  clientId: string
  clientName: string
  projectCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    setError("")
    startTransition(async () => {
      const res = await deleteClient(clientId)
      if (!res.success) {
        setError(res.error)
      } else {
        toast({ title: "Müvekkil silindi." })
        setOpen(false)
        router.push("/clients")
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError("") }}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-500 hover:text-red-700 transition-colors px-2.5 py-1 rounded-lg hover:bg-red-50">
          <Trash2 className="h-3 w-3" />
          Sil
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm rounded-2xl p-0 gap-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
            <Trash2 className="h-4 w-4 text-red-600" />
          </div>
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-[15px] font-semibold">Müvekkil Sil</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {projectCount > 0 && (
            <div className="rounded-xl px-3.5 py-2.5 text-sm bg-amber-50 text-amber-700 border border-amber-200">
              Bu müvekkile ait <strong>{projectCount} proje</strong> ve tüm işlemleri de silinecek.
              Bu işlem geri alınamaz.
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{clientName}</strong> adlı müvekkil kalıcı olarak
            silinecek. Bu işlem geri alınamaz.
          </p>

          {error && (
            <div className="rounded-xl px-3.5 py-2.5 text-sm bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1 border-t">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 rounded-xl mt-4 gap-2"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Siliniyor...</>
              ) : (
                <><Trash2 className="h-4 w-4" /> Evet, Sil</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl mt-4"
            >
              İptal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
