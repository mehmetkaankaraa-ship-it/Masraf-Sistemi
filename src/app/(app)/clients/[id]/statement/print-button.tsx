"use client"

import { Printer } from "lucide-react"

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-xl hover:opacity-90 transition-all shadow-sm"
    >
      <Printer className="h-3.5 w-3.5" />
      PDF / Yazdır
    </button>
  )
}
