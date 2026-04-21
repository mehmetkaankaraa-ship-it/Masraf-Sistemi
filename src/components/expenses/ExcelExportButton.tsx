'use client'

import { FileSpreadsheet } from 'lucide-react'

type Props = {
  from?: string
  to?: string
  userId?: string
  clientId?: string
}

export function ExcelExportButton({ from, to, userId, clientId }: Props) {
  function handleClick() {
    const params = new URLSearchParams()
    if (from)     params.set('from', from)
    if (to)       params.set('to', to)
    if (userId)   params.set('userId', userId)
    if (clientId) params.set('clientId', clientId)
    const url = `/api/reports/expenses?${params.toString()}`
    window.location.href = url
  }

  return (
    <button
      onClick={handleClick}
      className="h-9 px-4 text-[13px] font-medium border rounded-xl hover:bg-muted/40 transition-colors inline-flex items-center gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
    >
      <FileSpreadsheet className="h-3.5 w-3.5" />
      Excel'e Aktar
    </button>
  )
}
