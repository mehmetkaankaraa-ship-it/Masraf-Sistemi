"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createAdvance, createExpense, createRefund } from "@/actions/transactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Banknote, Receipt, RotateCcw, X } from "lucide-react"

type ProjectOption = { id: string; fileNo: string; title: string }

type UploadMeta = {
  originalName: string
  storageKey: string
  mimeType: string
  sizeBytes: number
}

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const modeConfig = {
  ADVANCE: { label: 'Avans',   icon: Banknote,   activeBg: 'bg-blue-600 text-white border-blue-600',   inactiveBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  EXPENSE: { label: 'Harcama', icon: Receipt,    activeBg: 'bg-orange-600 text-white border-orange-600', inactiveBg: 'bg-orange-50 text-orange-700 border-orange-200' },
  REFUND:  { label: 'İade',    icon: RotateCcw,  activeBg: 'bg-emerald-600 text-white border-emerald-600', inactiveBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export function TransactionsTabClient({
  clientId,
  projects,
}: {
  clientId: string
  isAdmin: boolean
  projects: ProjectOption[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"ADVANCE" | "EXPENSE" | "REFUND" | null>(null)
  const [msg, setMsg] = useState<string>("")
  const [msgType, setMsgType] = useState<"success" | "error">("error")
  const [isPending, startTransition] = useTransition()

  const projectOptions = useMemo(() => projects, [projects])
  const [projectId, setProjectId] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [date, setDate] = useState<string>(todayISO())
  const [description, setDescription] = useState<string>("")
  const [files, setFiles] = useState<File[]>([])

  function resetForm() {
    setMsg("")
    setProjectId("")
    setAmount("")
    setDate(todayISO())
    setDescription("")
    setFiles([])
  }

  async function uploadFiles(): Promise<UploadMeta[]> {
    if (!files.length) return []
    const fd = new FormData()
    for (const f of files) fd.append("files", f)
    const res = await fetch("/api/uploads", { method: "POST", body: fd })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(text || "Dosya yükleme başarısız.")
    }
    const json = (await res.json()) as { attachments: UploadMeta[] }
    return json.attachments ?? []
  }

  function validateBase() {
    const nAmount = Number(amount)
    if (!amount || !Number.isFinite(nAmount) || nAmount <= 0) return "Tutar geçersiz."
    if (!date) return "Tarih zorunlu."
    return null
  }

  function submit() {
    setMsg("")
    if (mode === "EXPENSE" && !projectId) {
      setMsg("Harcama için proje seçmek zorunlu.")
      setMsgType("error")
      return
    }
    const baseErr = validateBase()
    if (baseErr) {
      setMsg(baseErr)
      setMsgType("error")
      return
    }
    const nAmount = Number(amount)
    startTransition(async () => {
      try {
        if (mode === "ADVANCE") {
          const r = await createAdvance({ clientId, projectId: projectId || undefined, amount: nAmount, date, description: description || undefined })
          if (!r.success) throw new Error(r.error)
        }
        if (mode === "REFUND") {
          const r = await createRefund({ clientId, projectId: projectId || undefined, amount: nAmount, date, description: description || undefined })
          if (!r.success) throw new Error(r.error)
        }
        if (mode === "EXPENSE") {
          const uploaded = await uploadFiles()
          const r = await createExpense({ clientId, projectId, amount: nAmount, date, description: description || undefined, attachmentMeta: uploaded })
          if (!r.success) throw new Error(r.error)
        }
        setMsg("Kaydedildi.")
        setMsgType("success")
        resetForm()
        setMode(null)
        router.refresh()
      } catch (e: any) {
        setMsg(e?.message || "İşlem kaydedilemedi.")
        setMsgType("error")
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
      {/* Header with action buttons */}
      <div className="px-5 py-4 border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Yeni İşlem</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Türü seçerek devam edin</p>
          </div>
          <div className="flex gap-2">
            {(['ADVANCE', 'EXPENSE', 'REFUND'] as const).map((m) => {
              const cfg = modeConfig[m]
              const Icon = cfg.icon
              const active = mode === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    if (mode === m) { setMode(null); resetForm() }
                    else { resetForm(); setMode(m) }
                  }}
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-150 ${active ? cfg.activeBg : cfg.inactiveBg + ' hover:opacity-80'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Expandable form */}
      {mode && (
        <div className="px-5 py-5 space-y-4 border-t bg-muted/10">
          {msg && (
            <div className={`rounded-xl px-3.5 py-2.5 text-sm border ${msgType === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {msg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Tür</Label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border text-sm font-medium">
                {mode === 'ADVANCE' ? '💙 Avans' : mode === 'EXPENSE' ? '🟠 Harcama' : '💚 İade'}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Proje {mode === "EXPENSE" && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border bg-white text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">
                  {mode === "EXPENSE" ? "Proje seçin" : "Genel (projeye bağlı değil)"}
                </option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Tarih <span className="text-red-500 ml-0.5">*</span>
              </Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Tutar (TRY) <span className="text-red-500 ml-0.5">*</span>
              </Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="rounded-xl tabular-nums" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">Açıklama</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={1} placeholder="Opsiyonel..." className="rounded-xl resize-none" />
            </div>
          </div>

          {mode === "EXPENSE" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Fiş / Fatura</Label>
              <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="rounded-xl" />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground">{files.length} dosya seçildi: {files.map(f => f.name).join(', ')}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" onClick={submit} disabled={isPending || (mode === "EXPENSE" && projectOptions.length === 0)} className="rounded-xl">
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setMode(null); setMsg("") }} disabled={isPending} className="rounded-xl gap-1.5">
              <X className="h-3.5 w-3.5" />
              Vazgeç
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
