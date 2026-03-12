'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

type Filter = 'active' | 'inactive' | 'all'

export function UsersFilterBar({ totalActive, totalInactive }: { totalActive: number; totalInactive: number }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const filter = (searchParams.get('filter') as Filter) ?? 'active'
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function buildUrl(nextFilter: Filter, nextQ: string) {
    const params = new URLSearchParams()
    if (nextFilter !== 'active') params.set('filter', nextFilter)
    if (nextQ.trim()) params.set('q', nextQ.trim())
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function handleFilter(f: Filter) {
    router.push(buildUrl(f, query))
  }

  function handleSearch(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl(filter, value))
    }, 300)
  }

  function clearSearch() {
    setQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    router.push(buildUrl(filter, ''))
  }

  // Keep local state in sync if URL changes externally
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'active',   label: 'Aktif',   count: totalActive   },
    { key: 'inactive', label: 'Pasif',   count: totalInactive },
    { key: 'all',      label: 'Tümü',    count: totalActive + totalInactive },
  ]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilter(tab.key)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150',
              filter === tab.key
                ? 'bg-white text-foreground shadow-sm border'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
            <span className={[
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums',
              filter === tab.key
                ? tab.key === 'inactive' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground',
            ].join(' ')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative flex-1 sm:max-w-[260px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Ad veya e-posta ile ara…"
          className={[
            'w-full h-9 pl-8 pr-8 rounded-xl text-[13px] bg-white',
            'border border-border text-foreground',
            'placeholder:text-muted-foreground',
            'outline-none transition-all duration-150',
            'focus:border-primary/40 focus:ring-2 focus:ring-primary/10',
          ].join(' ')}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

    </div>
  )
}
