// src/app/(app)/projects/page.tsx
import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { FolderOpen, ChevronRight, CheckCircle2, Clock } from 'lucide-react'

export default async function ProjectsPage() {
  await requireSession()

  const projects = await prisma.project.findMany({
    include: {
      client: { select: { id: true, name: true } },
      _count:  { select: { transactions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const open   = projects.filter((p) => !p.closedAt)
  const closed = projects.filter((p) => p.closedAt)

  return (
    <div className="space-y-5 max-w-[860px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Projeler</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {projects.length} proje · {open.length} aktif, {closed.length} kapalı
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          {/* Active */}
          {open.length > 0 && (
            <Section title="Aktif Projeler" count={open.length} icon={<Clock className="h-3.5 w-3.5 text-emerald-500" />}>
              {open.map((p) => <ProjectRow key={p.id} project={p} />)}
            </Section>
          )}
          {/* Closed */}
          {closed.length > 0 && (
            <Section title="Kapalı Projeler" count={closed.length} icon={<CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />}>
              {closed.map((p) => <ProjectRow key={p.id} project={p} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string
  count: number
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border card-shadow overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b">
        {icon}
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        <span className="ml-auto text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="divide-y divide-border/50">{children}</div>
    </div>
  )
}

function ProjectRow({ project }: { project: any }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {!/^PRJ-\d{8}-\d{6}$/.test(project.fileNo) && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
                {project.fileNo}
              </span>
            )}
            <p className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {project.title}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            <Link href={`/clients/${project.client.id}`} className="hover:text-primary transition-colors">
              {project.client.name}
            </Link>
            {' · '}
            {format(new Date(project.createdAt), 'dd MMM yyyy', { locale: tr })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="text-[11px] text-muted-foreground">{project._count.transactions} işlem</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border card-shadow">
      <div className="py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <FolderOpen className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <p className="text-[14px] font-medium text-foreground mb-1">Henüz proje yok</p>
        <p className="text-[13px] text-muted-foreground mb-4">Proje oluşturmak için bir müvekkil seçin.</p>
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-xl hover:opacity-90 transition-all"
        >
          Müvekkillere Git
        </Link>
      </div>
    </div>
  )
}
