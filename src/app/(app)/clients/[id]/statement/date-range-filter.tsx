"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function DateRangeFilter({
  clientId,
  from,
  to,
}: {
  clientId: string
  from?: string
  to?: string
}) {
  const router = useRouter()
  const [fromVal, setFromVal] = useState(from ?? "")
  const [toVal, setToVal] = useState(to ?? "")

  function apply() {
    const params = new URLSearchParams()
    if (fromVal) params.set("from", fromVal)
    if (toVal) params.set("to", toVal)
    const qs = params.toString()
    router.push(`/clients/${clientId}/statement${qs ? `?${qs}` : ""}`)
  }

  function clear() {
    setFromVal("")
    setToVal("")
    router.push(`/clients/${clientId}/statement`)
  }

  return (
    <div className="no-print mt-3 mb-4 rounded-lg border p-4">
      <div className="text-sm font-medium">Tarih Aralığı (Opsiyonel)</div>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Başlangıç</label>
          <input
            type="date"
            value={fromVal}
            onChange={(e) => setFromVal(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Bitiş</label>
          <input
            type="date"
            value={toVal}
            onChange={(e) => setToVal(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={apply}
            className="h-10 rounded-md bg-black px-4 text-sm text-white hover:opacity-90"
          >
            Uygula
          </button>
          <button
            type="button"
            onClick={clear}
            className="h-10 rounded-md border px-4 text-sm hover:bg-accent"
          >
            Temizle
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Başlangıç ve/veya bitiş seçmeden de ekstre alabilirsiniz.
      </div>
    </div>
  )
}