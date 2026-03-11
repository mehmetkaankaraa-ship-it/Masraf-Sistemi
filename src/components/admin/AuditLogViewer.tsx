'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { format } from 'date-fns'

type Log = {
  id: string
  entityType: string
  entityId: string
  actionType: string
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  timestamp: string
  performedBy: { id: string; name: string; email: string }
}

interface Props {
  logs: Log[]
  users: { id: string; name: string }[]
  total: number
  page: number
  currentFilters: {
    userId?: string
    entityType?: string
    dateFrom?: string
    dateTo?: string
  }
}

const actionBadge = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
}

const entityLabel = {
  CLIENT: 'Müvekkil',
  PROJECT: 'Proje',
  TRANSACTION: 'İşlem',
  USER: 'Kullanıcı',
}

const actionLabel = {
  CREATE: 'Oluşturuldu',
  UPDATE: 'Güncellendi',
  DELETE: 'Silindi',
}

function JsonDiff({ label, data, color }: { label: string; data: Record<string, any> | null; color: string }) {
  if (!data) return null
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${color}`}>{label}</p>
      <div className="bg-muted/40 rounded-lg p-2.5 text-[11px] font-mono overflow-x-auto max-h-32 overflow-y-auto">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-muted-foreground shrink-0">{k}:</span>
            <span className="text-foreground break-all">{JSON.stringify(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AuditLogViewer({ logs, users, total, page, currentFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState(currentFilters)

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function applyFilters() {
    const params = new URLSearchParams()
    if (filters.userId) params.set('userId', filters.userId)
    if (filters.entityType) params.set('entityType', filters.entityType)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearFilters() {
    setFilters({})
    router.push(pathname)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border card-shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] font-semibold text-foreground">Filtreler</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            className="px-2.5 py-2 rounded-lg border bg-white text-[12px] outline-none focus:border-primary/50"
            value={filters.userId ?? ''}
            onChange={e => setFilters(f => ({ ...f, userId: e.target.value || undefined }))}
          >
            <option value="">Tüm Kullanıcılar</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <select
            className="px-2.5 py-2 rounded-lg border bg-white text-[12px] outline-none focus:border-primary/50"
            value={filters.entityType ?? ''}
            onChange={e => setFilters(f => ({ ...f, entityType: e.target.value || undefined }))}
          >
            <option value="">Tüm Türler</option>
            <option value="CLIENT">Müvekkil</option>
            <option value="PROJECT">Proje</option>
            <option value="TRANSACTION">İşlem</option>
          </select>

          <input
            type="date"
            className="px-2.5 py-2 rounded-lg border bg-white text-[12px] outline-none focus:border-primary/50"
            value={filters.dateFrom ?? ''}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))}
            placeholder="Başlangıç"
          />

          <input
            type="date"
            className="px-2.5 py-2 rounded-lg border bg-white text-[12px] outline-none focus:border-primary/50"
            value={filters.dateTo ?? ''}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || undefined }))}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={applyFilters}
            className="px-3.5 py-1.5 bg-primary text-primary-foreground text-[12px] font-medium rounded-lg hover:opacity-90 transition-all"
          >
            Uygula
          </button>
          <button
            onClick={clearFilters}
            className="px-3.5 py-1.5 bg-muted text-muted-foreground text-[12px] font-medium rounded-lg hover:bg-accent transition-all"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl border card-shadow overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-[12px] font-semibold text-foreground">
            {total} kayıt · Sayfa {page}
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
            Filtrelerle eşleşen kayıt bulunamadı.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {logs.map(log => {
              const isExp = expanded.has(log.id)
              const badgeClass = actionBadge[log.actionType as keyof typeof actionBadge] ?? 'bg-muted text-muted-foreground'
              return (
                <div key={log.id}>
                  <button
                    onClick={() => toggleExpand(log.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/15 transition-colors"
                  >
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${badgeClass}`}>
                      {actionLabel[log.actionType as keyof typeof actionLabel] ?? log.actionType}
                    </span>
                    <span className="text-[12px] font-medium text-foreground shrink-0">
                      {entityLabel[log.entityType as keyof typeof entityLabel] ?? log.entityType}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate flex-1">
                      ID: {log.entityId.slice(0, 12)}...
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {log.performedBy.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                      {format(new Date(log.timestamp), 'dd.MM.yyyy HH:mm')}
                    </span>
                    {isExp ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {isExp && (
                    <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/5 border-t">
                      <div className="pt-3 space-y-3">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Kullanıcı</p>
                          <p className="text-[12px] text-foreground">{log.performedBy.name} <span className="text-muted-foreground">({log.performedBy.email})</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Zaman</p>
                          <p className="text-[12px] text-foreground">{format(new Date(log.timestamp), 'dd.MM.yyyy HH:mm:ss')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Kayıt ID</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{log.entityId}</p>
                        </div>
                      </div>
                      <div className="pt-3 space-y-3">
                        {log.oldValues && (
                          <JsonDiff label="Önceki Değerler" data={log.oldValues} color="text-rose-600" />
                        )}
                        {log.newValues && (
                          <JsonDiff label="Yeni Değerler" data={log.newValues} color="text-emerald-600" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-end gap-2">
          {page > 1 && (
            <button
              onClick={() => {
                const params = new URLSearchParams(currentFilters as any)
                params.set('page', String(page - 1))
                router.push(`${pathname}?${params.toString()}`)
              }}
              className="px-3 py-1.5 text-[12px] bg-white border rounded-lg hover:bg-muted/30 transition-colors"
            >
              ← Önceki
            </button>
          )}
          {page * 50 < total && (
            <button
              onClick={() => {
                const params = new URLSearchParams(currentFilters as any)
                params.set('page', String(page + 1))
                router.push(`${pathname}?${params.toString()}`)
              }}
              className="px-3 py-1.5 text-[12px] bg-white border rounded-lg hover:bg-muted/30 transition-colors"
            >
              Sonraki →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
