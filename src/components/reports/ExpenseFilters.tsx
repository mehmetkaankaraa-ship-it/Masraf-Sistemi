"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

interface FilterOption {
  id: string
  name: string
}

interface ProjectOption {
  id: string
  fileNo: string
  title: string
  clientId: string
}

interface ExpenseFiltersProps {
  clients: FilterOption[]
  projects: ProjectOption[]
  users: FilterOption[]
  current: {
    from?: string
    to?: string
    clientId?: string
    projectId?: string
    userId?: string
  }
}

export function ExpenseFilters({
  clients,
  projects,
  users,
  current,
}: ExpenseFiltersProps) {
  const router = useRouter()

  const [from, setFrom] = useState(current.from ?? "")
  const [to, setTo] = useState(current.to ?? "")
  const [clientId, setClientId] = useState(current.clientId ?? "")
  const [projectId, setProjectId] = useState(current.projectId ?? "")
  const [userId, setUserId] = useState(current.userId ?? "")

  const visibleProjects = clientId
    ? projects.filter((p) => p.clientId === clientId)
    : projects

  function apply() {
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (clientId) params.set("clientId", clientId)
    if (projectId) params.set("projectId", projectId)
    if (userId) params.set("userId", userId)
    const qs = params.toString()
    router.push(`/reports/expenses${qs ? `?${qs}` : ""}`)
  }

  function clear() {
    setFrom("")
    setTo("")
    setClientId("")
    setProjectId("")
    setUserId("")
    router.push("/reports/expenses")
  }

  const hasFilters = from || to || clientId || projectId || userId

  return (
    <div className="bg-white rounded-xl border card-shadow px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Filtreler
      </p>
      <div className="flex flex-wrap gap-3 items-end">
        {/* Date range */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Başlangıç
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 text-[13px] border rounded-lg outline-none focus:border-primary/60 bg-background"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Bitiş
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 px-3 text-[13px] border rounded-lg outline-none focus:border-primary/60 bg-background"
          />
        </div>

        <div className="h-9 w-px bg-border self-end hidden sm:block" />

        {/* Client */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Müvekkil
          </label>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              setProjectId("")
            }}
            className="h-9 px-3 text-[13px] border rounded-lg outline-none focus:border-primary/60 bg-background"
          >
            <option value="">Tümü</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Proje
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 px-3 text-[13px] border rounded-lg outline-none focus:border-primary/60 bg-background"
          >
            <option value="">Tümü</option>
            {visibleProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fileNo} — {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* User */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Çalışan
          </label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-9 px-3 text-[13px] border rounded-lg outline-none focus:border-primary/60 bg-background"
          >
            <option value="">Tümü</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 self-end">
          <button
            type="button"
            onClick={apply}
            className="h-9 px-4 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Filtrele
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={clear}
              className="h-9 px-4 text-[13px] font-medium border rounded-lg hover:bg-accent transition-colors"
            >
              Temizle
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
