// src/app/(app)/clients/page.tsx
import Link from "next/link"
import { getClients } from "@/actions/clients"
import { Button } from "@/components/ui/button"
import { Plus, User2, ChevronRight, FolderOpen, Receipt } from "lucide-react"
import { ClientSearch } from "@/components/clients/ClientSearch"

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = searchParams?.q ?? ""
  const clients = await getClients(q)

  return (
    <div className="space-y-5 max-w-[900px]">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Müvekkiller</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length} müvekkil{q ? ` "${q}" için` : ''}
          </p>
        </div>
        <Button asChild className="rounded-xl shadow-sm gap-2">
          <Link href="/clients/new">
            <Plus className="h-4 w-4" />
            Yeni Müvekkil
          </Link>
        </Button>
      </div>

      {/* Search */}
      <ClientSearch defaultValue={q} />

      {/* Empty state */}
      {clients.length === 0 ? (
        <div className="bg-white rounded-2xl border card-shadow flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <User2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {q ? "Arama sonucu bulunamadı." : "Henüz müvekkil yok."}
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {q ? `"${q}" için eşleşen kayıt bulunamadı.` : "İlk müvekkilinizi ekleyerek başlayın."}
          </p>
          {!q && (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/clients/new">
                <Plus className="mr-1.5 h-4 w-4" />
                İlk Müvekkilinizi Ekleyin
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
          <div className="divide-y divide-border/60">
            {clients.map((client) => {
              const projectsCount = client?._count?.projects ?? 0
              const txCount = client?._count?.transactions ?? 0
              const colorClass = avatarColor(client.name)

              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group"
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colorClass}`}>
                    {getInitials(client.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {client.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {client.email || client.phone || "Bilgi yok"}
                    </p>
                  </div>

                  {/* Counts */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FolderOpen className="h-3.5 w-3.5" />
                      {projectsCount} proje
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Receipt className="h-3.5 w-3.5" />
                      {txCount} işlem
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}