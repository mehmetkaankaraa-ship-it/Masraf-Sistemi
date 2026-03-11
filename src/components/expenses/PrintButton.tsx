'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="h-9 px-4 text-[13px] font-medium border rounded-xl hover:bg-muted/40 transition-colors print:hidden"
    >
      Yazdır / PDF
    </button>
  )
}
