'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, FolderOpen, X, Loader2, Command } from 'lucide-react'

type SearchResult = {
  clients: { id: string; name: string; email: string | null }[]
  projects: { id: string; title: string; fileNo: string; client: { name: string } }[]
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ clients: [], projects: [] })
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults({ clients: [], projects: [] })
      setActiveIndex(0)
    }
  }, [open])

  // Real-time search
  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults({ clients: [], projects: [] })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data: SearchResult = await res.json()
      setResults(data)
      setActiveIndex(0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 200)
  }

  // Build flat item list for keyboard nav
  const allItems = [
    ...results.clients.map((c) => ({ type: 'client' as const, id: c.id, label: c.name, sub: c.email ?? '', href: `/clients/${c.id}` })),
    ...results.projects.map((p) => ({ type: 'project' as const, id: p.id, label: p.title, sub: `${p.fileNo} · ${p.client.name}`, href: `/projects/${p.id}` })),
  ]

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, allItems.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter' && allItems[activeIndex]) { navigate(allItems[activeIndex].href); return }
  }

  if (!open) return null

  const hasResults = allItems.length > 0
  const showEmpty = query.length > 0 && !loading && !hasResults

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(10,12,20,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full"
        style={{ maxWidth: '560px', border: '1px solid hsl(var(--border))' }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b">
          {loading
            ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
            : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="Müvekkil veya proje ara..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground text-foreground"
          />
          <button
            onClick={onClose}
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
          {/* Idle state */}
          {query.length === 0 && (
            <div className="px-4 py-8 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <Command className="h-4 w-4" />
                <span className="text-sm">Müvekkil adı veya proje dosya numarası girin</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                "<span className="font-medium text-foreground">{query}</span>" için sonuç bulunamadı.
              </p>
            </div>
          )}

          {/* Clients */}
          {results.clients.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b bg-muted/20">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Müvekkiller
                </p>
              </div>
              {results.clients.map((c, idx) => {
                const flatIdx = idx
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: activeIndex === flatIdx ? 'hsl(var(--accent))' : 'transparent' }}
                    onMouseEnter={() => setActiveIndex(flatIdx)}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b bg-muted/20">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <FolderOpen className="h-3 w-3" /> Projeler
                </p>
              </div>
              {results.projects.map((p, idx) => {
                const flatIdx = results.clients.length + idx
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: activeIndex === flatIdx ? 'hsl(var(--accent))' : 'transparent' }}
                    onMouseEnter={() => setActiveIndex(flatIdx)}
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FolderOpen className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.fileNo} · {p.client.name}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="font-mono bg-white border rounded px-1 py-0.5 text-[10px]">↑↓</kbd> Gezin</span>
          <span className="flex items-center gap-1"><kbd className="font-mono bg-white border rounded px-1 py-0.5 text-[10px]">↵</kbd> Aç</span>
          <span className="flex items-center gap-1"><kbd className="font-mono bg-white border rounded px-1 py-0.5 text-[10px]">Esc</kbd> Kapat</span>
        </div>
      </div>
    </div>
  )
}
