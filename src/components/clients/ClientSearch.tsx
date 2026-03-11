// src/components/clients/ClientSearch.tsx
'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { useTransition } from 'react'

export function ClientSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    startTransition(() => {
      if (q) {
        router.replace(`${pathname}?q=${encodeURIComponent(q)}`)
      } else {
        router.replace(pathname)
      }
    })
  }

  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        placeholder="İsim, e-posta veya telefon ara..."
        defaultValue={defaultValue}
        onChange={handleChange}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
      />
    </div>
  )
}
