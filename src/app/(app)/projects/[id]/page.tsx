// src/app/(app)/projects/[id]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProjectById } from '@/actions/projects'
import { computeBalance } from '@/lib/balance.server'
import { formatTRY } from '@/lib/balance'
import { listTransactions } from '@/actions/transactions'
import { requireSession } from '@/lib/session'
import { ArrowLeft, Wallet, FolderOpen, Lock } from 'lucide-react'
import { LedgerTable } from '@/components/transactions/LedgerTable'
import { AddAdvanceModal } from '@/components/transactions/AddAdvanceModal'
import { AddExpenseModal } from '@/components/transactions/AddExpenseModal'
import { AddRefundModal } from '@/components/transactions/AddRefundModal'
import { EditProjectModal } from '@/components/projects/EditProjectModal'

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: Record<string, string>
}) {
  const session = await requireSession()
  const project = await getProjectById(params.id)
  if (!project) notFound()

  const isAdmin = session.user.role === 'ADMIN'
  const balance = await computeBalance(project.clientId)
  const { transactions, total } = await listTransactions({
    clientId:  project.clientId,
    projectId: project.id,
    ...searchParams,
  })

  const projectAsArray = [{ id: project.id, fileNo: project.fileNo, title: project.title }]
  const balanceNum = balance.toNumber()

  return (
    <div className="space-y-5 max-w-[980px]">

      {/* Back nav */}
      <Link
        href={`/clients/${project.clientId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {project.client.name}
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border card-shadow px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {project.fileNo}
                </span>
                {project.closedAt && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Lock className="h-2.5 w-2.5" /> Kapalı
                  </span>
                )}
              </div>
              <h1 className="text-lg font-semibold text-foreground">{project.title}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Balance */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">Proje Bakiyesi</p>
                <p className={`text-sm font-bold tabular-nums leading-tight ${balanceNum < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                  {formatTRY(balanceNum)}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <EditProjectModal project={project} isAdmin={isAdmin} />
            <AddAdvanceModal clientId={project.clientId} projects={projectAsArray} isAdmin={isAdmin} />
            <AddExpenseModal clientId={project.clientId} projects={projectAsArray} isAdmin={isAdmin} />
            <AddRefundModal  clientId={project.clientId} projects={projectAsArray} isAdmin={isAdmin} />
          </div>
        </div>
      </div>

      {/* Transactions section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            İşlemler
            <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {total}
            </span>
          </h2>
        </div>
        <LedgerTable
          transactions={transactions}
          clientId={project.clientId}
          projects={projectAsArray}
          isAdmin={isAdmin}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  )
}

