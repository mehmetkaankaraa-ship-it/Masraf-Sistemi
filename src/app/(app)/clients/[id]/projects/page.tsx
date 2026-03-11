// src/app/(app)/clients/[id]/projects/new/page.tsx
import { notFound } from "next/navigation"
import { getClientById } from "@/actions/clients"
import { ProjectForm } from "@/components/projects/ProjectForm"

export default async function NewProjectPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id)
  if (!client) notFound()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Müvekkil: {client.name}</p>
        <h1 className="text-2xl font-bold">Yeni Proje</h1>
      </div>

      <ProjectForm clientId={params.id} />
    </div>
  )
}