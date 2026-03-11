'use client'

import React, { useEffect, useState } from 'react'
import { Search, Command, Plus, UserPlus, FolderPlus, SendHorizonal } from 'lucide-react'
import Link from 'next/link'
import { CommandPalette }  from '@/components/layout/CommandPalette'
import { QuickExpenseModal } from '@/components/dashboard/QuickExpenseModal'
import { QuickProjectModal } from '@/components/dashboard/QuickProjectModal'
import { QuickClientModal }  from '@/components/dashboard/QuickClientModal'

interface Props {
  children: React.ReactNode
  isAdmin: boolean
}

export function DashboardShell({ children, isAdmin }: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [clientOpen,  setClientOpen]  = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <QuickExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} />
      <QuickProjectModal open={projectOpen} onClose={() => setProjectOpen(false)} />
      <QuickClientModal  open={clientOpen}  onClose={() => setClientOpen(false)} />

      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Hoş geldiniz. Genel duruma genel bakın.</p>
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2.5 bg-white border rounded-xl px-3.5 py-2 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-200 group text-left w-full sm:w-[220px]"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            <span className="flex-1 text-[13px] text-muted-foreground select-none">Ara...</span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border shrink-0">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            onClick={() => setExpenseOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3.5 sm:py-2 bg-foreground text-background text-[13px] font-medium rounded-xl hover:opacity-85 active:scale-95 transition-all duration-150 shadow-sm"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Harcama Ekle</span>
          </button>

          <button
            onClick={() => setProjectOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3.5 sm:py-2 bg-violet-600 text-white text-[13px] font-medium rounded-xl hover:opacity-90 active:scale-95 transition-all duration-150 shadow-sm"
          >
            <FolderPlus className="h-4 w-4 shrink-0" />
            <span>Proje Oluştur</span>
          </button>

          {isAdmin && (
            <Link
              href="/admin/transfers/new"
              className="flex items-center justify-center gap-2 px-4 py-3.5 sm:py-2 bg-emerald-600 text-white text-[13px] font-medium rounded-xl hover:opacity-90 active:scale-95 transition-all duration-150 shadow-sm"
            >
              <SendHorizonal className="h-4 w-4 shrink-0" />
              <span>Avans Gönder</span>
            </Link>
          )}

          {/* Quick Add Client — replaces the old "Müvekkiller" link */}
          <button
            onClick={() => setClientOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3.5 sm:py-2 bg-white border text-foreground text-[13px] font-medium rounded-xl hover:bg-muted/40 hover:border-primary/20 active:scale-95 transition-all duration-150 shadow-sm"
          >
            <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Müvekkil Ekle</span>
          </button>
        </div>

        {children}
      </div>
    </>
  )
}
